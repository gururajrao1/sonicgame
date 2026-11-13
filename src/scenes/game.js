import k from "../kaplayCtx";
import { makeSonic } from "../entities/sonic";
import { makeMotobug } from "../entities/motobug";
import { makeBuzz } from "../entities/buzz";
import { makeMonitor } from "../entities/itemBox";
import { makeRing } from "../entities/ring";

const MAX_SPEED = 1400;

export default function game() {
  const citySfx = k.play("city", { volume: 0.2, loop: true });

  // Persisted settings.
  let muted = k.getData("muted") === true;
  let calmMode = k.getData("calm") === true;
  let chillMode = k.getData("chill") === true;
  const applyVolume = () => {
    if (typeof k.volume === "function") k.volume(muted ? 0 : 1);
  };
  applyVolume();
  const buzz = (ms) => {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {
      /* no haptics */
    }
  };
  k.setGravity(3100);
  const bgPieceWidth = 1920;
  const bgPieces = [
    k.add([
      k.sprite("chemical-bg"),
      k.pos(0, 0),
      k.scale(2),
      k.opacity(0.8),
      k.color(255, 255, 255),
    ]),
    k.add([
      k.sprite("chemical-bg"),
      k.pos(bgPieceWidth, 0),
      k.scale(2),
      k.opacity(0.8),
      k.color(255, 255, 255),
    ]),
  ];

  const platforms = [
    k.add([k.sprite("platforms"), k.pos(0, 450), k.scale(4)]),
    k.add([k.sprite("platforms"), k.pos(384, 450), k.scale(4)]),
  ];

  const sonic = makeSonic(k.vec2(200, 745));
  sonic.setControls();
  sonic.setEvents();

  // Landing dust puff, scaled by air time, plus speed-scaled run dust.
  let wasAirborne = false;
  let airStart = 0;
  let runDustT = 0;

  const controlsText = k.add([
    k.text("Press Space/Click/Touch to Jump!", {
      font: "mania",
      size: 64,
    }),
    k.anchor("center"),
    k.pos(k.center()),
  ]);

  const dismissControlsAction = k.onButtonPress("jump", () => {
    k.destroy(controlsText);
    dismissControlsAction.cancel();
  });

  // Code-drawn puffy clouds drifting behind everything (added before HUD).
  const makeCloud = (x, y, s = 1) => {
    const c = k.add([k.pos(x, y)]);
    const puff = (dx, dy, r, cr, cg, cb) => {
      c.add([
        k.circle(r * s),
        k.pos(dx * s, dy * s),
        k.color(cr, cg, cb),
        k.anchor("center"),
      ]);
    };
    puff(0, 26, 64, 205, 232, 245);
    puff(-82, 12, 42, 255, 255, 255);
    puff(0, -14, 58, 255, 255, 255);
    puff(82, 12, 44, 255, 255, 255);
    return c;
  };
  const clouds = [];
  for (let i = 0; i < 3; i++) {
    clouds.push(makeCloud(k.rand(0, 1920), k.rand(60, 260), k.rand(0.9, 1.4)));
  }

  const scoreText = k.add([
    k.text("SCORE : 0", { font: "mania", size: 72 }),
    k.pos(20, 20),
  ]);
  const ringsText = k.add([
    k.text("RINGS : 0", { font: "mania", size: 48 }),
    k.pos(20, 110),
  ]);
  const actText = k.add([
    k.text("ACT 1 - CHEMICAL NIGHT", { font: "mania", size: 36 }),
    k.pos(20, 170),
  ]);
  k.add([k.rect(304, 18), k.color(0, 0, 0), k.pos(20, 214)]);
  const actBar = k.add([
    k.rect(0, 12),
    k.color(60, 220, 90),
    k.pos(23, 217),
  ]);

  // Tiny square spark burst (no tween API needed).
  const burst = (pos, r, g, b, n = 6, speed = 320) => {
    for (let i = 0; i < n; i++) {
      const a = k.rand(0, Math.PI * 2);
      const p = k.add([
        k.rect(12, 12),
        k.pos(pos),
        k.color(r, g, b),
        k.opacity(1),
        k.anchor("center"),
      ]);
      let vx = Math.cos(a) * k.rand(speed * 0.4, speed);
      let vy = Math.sin(a) * k.rand(speed * 0.4, speed) - 160;
      let life = 0.5;
      p.onUpdate(() => {
        life -= k.dt();
        if (life <= 0) {
          k.destroy(p);
          return;
        }
        vy += 1400 * k.dt();
        p.pos.x += vx * k.dt();
        p.pos.y += vy * k.dt();
        p.opacity = Math.min(1, life * 2);
      });
    }
  };
  // Floating world-space score popup.
  const popup = (pos, msg, size = 40) => {
    const t = k.add([
      k.text(msg, { font: "mania", size }),
      k.anchor("center"),
      k.pos(pos),
      k.opacity(1),
    ]);
    let life = 0.9;
    t.onUpdate(() => {
      life -= k.dt();
      if (life <= 0) {
        k.destroy(t);
        return;
      }
      t.pos.y -= 120 * k.dt();
      t.opacity = Math.min(1, life * 1.5);
    });
  };

  const easeOutBack = (k.easings && k.easings.easeOutBack) || ((t) => t);

  let score = 0;
  let ringCount = 0;
  let scoreMultiplier = 0;
  let hasFire = false;
  let fireBadge = null;
  let lastShot = -10;

  const loseFire = () => {
    hasFire = false;
    if (fireBadge) {
      k.destroy(fireBadge);
      fireBadge = null;
    }
  };
  let act = 1;
  let actTime = 0;
  let clearing = false;

  const ACT_LEN = 40;
  const ACT_NAMES = ["CHEMICAL NIGHT", "NEON RUSH", "CHROME DAWN"];
  const ACT_TINTS = [
    [255, 255, 255],
    [190, 255, 200],
    [255, 215, 240],
    [210, 225, 255],
  ];

  const applyActLook = () => {
    const tint = k.Color.fromArray(ACT_TINTS[(act - 1) % ACT_TINTS.length]);
    for (const b of bgPieces) b.color = tint;
  };
  let ringLabelGen = 0;
  let invulnerable = false;
  let dead = false;

  const showLabel = (msg) => {
    ringLabelGen += 1;
    const gen = ringLabelGen;
    sonic.ringCollectUI.text = msg;
    k.wait(1, () => {
      if (gen === ringLabelGen) sonic.ringCollectUI.text = "";
    });
  };

  sonic.onCollide("ring", (ring) => {
    if (dead) return;
    if (ring.cooldownUntil && k.time() < ring.cooldownUntil) return;
    k.play("ring", { volume: 0.5 });
    burst(ring.pos, 255, 215, 0, 5, 260);
    k.destroy(ring);
    score++;
    ringCount++;
    scoreText.text = `SCORE : ${score}`;
    ringsText.text = `RINGS : ${ringCount}`;
    showLabel("+1");
  });

  const showActCard = (label) => {
    const card = k.add([
      k.text(label, { font: "mania", size: 72 }),
      k.anchor("center"),
      k.pos(k.center()),
      k.opacity(1),
    ]);
    card.scale = k.vec2(0.5);
    if (card.tween) {
      card.tween(0.5, 1, 0.35, (v) => {
        card.scale = k.vec2(v);
      }, easeOutBack);
    }
    k.wait(1.2, () => {
      if (card.tween) {
        card.tween(1, 0, 0.4, (v) => {
          card.opacity = v;
        });
      }
    });
    k.wait(1.6, () => k.destroy(card));
  };

  const clearAct = () => {
    clearing = true;
    const bonus = 50 * act;
    score += bonus;
    ringCount += 5;
    scoreText.text = `SCORE : ${score}`;
    ringsText.text = `RINGS : ${ringCount}`;
    k.play("hyper-ring", { volume: 0.5 });
    const banner = k.add([
      k.text(`ACT ${act} CLEAR!  +${bonus}`, { font: "mania", size: 80 }),
      k.anchor("center"),
      k.pos(k.center()),
      k.opacity(1),
    ]);
    banner.scale = k.vec2(0.5);
    if (banner.tween) {
      banner.tween(0.5, 1, 0.35, (v) => {
        banner.scale = k.vec2(v);
      }, easeOutBack);
    }
    k.wait(2.1, () => {
      if (banner.tween) banner.tween(1, 0, 0.4, (v) => {
        banner.opacity = v;
      });
    });
    k.wait(2.5, () => {
      k.destroy(banner);
      act += 1;
      actTime = 0;
      gameSpeed = Math.min(300 + (act - 1) * 150, 900);
      actText.text = `ACT ${act} - ${ACT_NAMES[(act - 1) % ACT_NAMES.length]}`;
      applyActLook();
      showActCard(`ACT ${act} - ${ACT_NAMES[(act - 1) % ACT_NAMES.length]}`);
      clearing = false;
    });
  };

  const shootFire = () => {
    if (!hasFire || dead || clearing || paused) return;
    if (k.time() - lastShot < 0.35) return;
    lastShot = k.time();
    k.play("jump", { volume: 0.3 });
    const f = k.add([
      k.circle(14),
      k.pos(sonic.pos.x + 40, sonic.pos.y),
      k.color(255, 140, 0),
      k.area(),
      k.anchor("center"),
      k.offscreen(),
      "fire",
    ]);
    const vx = gameSpeed + 900;
    let vy = -250;
    f.onUpdate(() => {
      vy += 2600 * k.dt();
      f.pos.x += vx * k.dt();
      f.pos.y += vy * k.dt();
      if (f.pos.y > 800) {
        f.pos.y = 800;
        vy *= -0.55;
      }
    });
    f.onCollide("enemy", (enemy) => {
      burst(enemy.pos, 255, 140, 0, 8, 360);
      k.play("destroy", { volume: 0.5 });
      k.destroy(enemy);
      score += 10;
      scoreText.text = `SCORE : ${score}`;
      popup(enemy.pos, "+10", 40);
      k.destroy(f);
    });
  };
  k.onButtonPress("fire", shootFire);

  const die = () => {
    if (dead) return;
    dead = true;
    loseFire();
    k.play("hurt", { volume: 0.5 });
    buzz(80);
    k.setData("current-score", score);
    if (!calmMode) {
      try {
        k.camFlash(k.Color.fromArray([255, 255, 255]), 0.4);
      } catch {
        /* no flash */
      }
      if (typeof k.addKaboom === "function") {
        try {
          k.addKaboom(sonic.pos);
        } catch {
          /* no kaboom */
        }
      } else {
        burst(sonic.pos, 255, 255, 255, 10, 420);
      }
    }
    try {
      citySfx.stop();
    } catch {
      citySfx.paused = true;
    }
    sonic.play("jump");
    if (sonic.vel) sonic.vel.y = -900;
    // Slow-mo beat before the transition (wait() is timer-scaled).
    k.timeScale = 0.35;
    k.wait(0.25, () => {
      k.timeScale = 1;
      k.go("gameover");
    });
  };

  const hurtWithRings = () => {
    // Mario rule: a hit also costs the fire power.
    loseFire();
    // Classic scatter: drop rings that can be re-grabbed after a cooldown.
    const dropped = Math.min(ringCount, 12);
    ringCount = 0;
    ringsText.text = `RINGS : ${ringCount}`;
    k.play("ring-loss", { volume: 0.5 });
    const now = k.time();
    for (let i = 0; i < dropped; i++) {
      const r = makeRing(k.vec2(sonic.pos.x, sonic.pos.y - 20));
      r.cooldownUntil = now + 1.5;
      r.scatterVx = k.rand(-350, 350);
      r.scatterVy = k.rand(-900, -400);
      r.scatterLife = 6;
      r.onUpdate(() => {
        r.scatterLife -= k.dt();
        if (r.scatterLife <= 0) {
          k.destroy(r);
          return;
        }
        r.scatterVy += 2600 * k.dt();
        r.pos.x += (r.scatterVx - gameSpeed) * k.dt();
        r.pos.y += r.scatterVy * k.dt();
        if (r.pos.y > 800) {
          r.pos.y = 800;
          r.scatterVy *= -0.55;
          r.scatterVx *= 0.8;
        }
      });
    }
    burst(sonic.pos, 255, 60, 60, 8, 380);
    if (!calmMode) {
      k.shake(6);
      try {
        k.camFlash(k.Color.fromArray([255, 40, 40]), 0.25);
      } catch {
        /* no flash */
      }
    }
    buzz(40);
    showLabel("OUCH!");
    invulnerable = true;
    sonic.opacity = 0.4;
    if (sonic.vel) sonic.vel.y = -700;
    sonic.play("jump");
    k.wait(2, () => {
      invulnerable = false;
      sonic.opacity = 1;
    });
  };

  sonic.onCollide("enemy", (enemy) => {
    if (dead || invulnerable || clearing || paused) return;
    const falling = sonic.vel ? sonic.vel.y > 100 : !sonic.isGrounded();
    const above = sonic.pos.y < enemy.pos.y - 10;
    if (falling && above) {
      k.play("destroy", { volume: 0.5 });
      k.play("hyper-ring", { volume: 0.5 });
      burst(enemy.pos, 255, 120, 0, 8, 380);
      if (!calmMode) k.shake(10);
      buzz(25);
      const wasFirst = scoreMultiplier === 0;
      k.destroy(enemy);
      sonic.play("jump");
      sonic.jump();
      scoreMultiplier += 1;
      score += 10 * scoreMultiplier;
      scoreText.text = `SCORE : ${score}`;
      if (wasFirst) showLabel(`+${10 * scoreMultiplier}`);
      else showLabel(`x${scoreMultiplier}`);
      popup(enemy.pos, wasFirst ? `+${10 * scoreMultiplier}` : `x${scoreMultiplier}`, 44);
      return;
    }

    if (ringCount > 0) {
      hurtWithRings();
      return;
    }
    die();
  });

  let gameSpeed = 300;
  const topSpeed = chillMode ? 1000 : MAX_SPEED;
  k.loop(1, () => {
    if (gameSpeed < topSpeed) gameSpeed += 50;
  });

  const spawnMotoBug = () => {
    // Later acts sometimes send a pair.
    const pack = act >= 2 && k.rand(0, 1) < 0.45 ? 2 : 1;
    for (let i = 0; i < pack; i++) {
      const motobug = makeMotobug(k.vec2(k.width() + 40 + i * 260, 773));
      motobug.onUpdate(() => {
        motobug.move(-(gameSpeed + 300), 0);
      });

      motobug.onExitScreen(() => {
        if (motobug.pos.x < 0) k.destroy(motobug);
      });
    }

    const minGap = Math.max(0.5, 1.6 - gameSpeed / 1400);
    const waitTime = k.rand(minGap, 2.5);
    k.wait(waitTime, spawnMotoBug);
  };

  spawnMotoBug();

  // Flying buzz bomber: sine-wave flight at jump height.
  // Later acts fly lower and faster.
  const spawnBuzz = () => {
    const top = Math.max(300, 380 - (act - 1) * 30);
    const bottom = Math.max(420, 620 - (act - 1) * 40);
    const buzz = makeBuzz(k.vec2(k.width() + 60, k.rand(top, bottom)));
    const baseY = buzz.pos.y;
    const phase = k.rand(0, Math.PI * 2);
    const quick = 1.05 + (act - 1) * 0.03;
    buzz.onUpdate(() => {
      buzz.move(-gameSpeed * quick, 0);
      buzz.pos.y = baseY + Math.sin(k.time() * 4 + phase) * 40;
    });
    buzz.onExitScreen(() => {
      if (buzz.pos.x < -100) k.destroy(buzz);
    });
    k.wait(k.rand(4, 8), spawnBuzz);
  };

  spawnBuzz();

  // Fire-flower monitor: touch to break and gain shots (lost on hit).
  const spawnMonitor = () => {
    const m = makeMonitor(k.vec2(k.width() + 60, k.rand(430, 560)));
    m.onUpdate(() => {
      m.move(-gameSpeed, 0);
    });
    m.onExitScreen(() => {
      if (m.pos.x < -100) k.destroy(m);
    });
    k.wait(k.rand(16, 26), spawnMonitor);
  };

  spawnMonitor();

  sonic.onCollide("itembox", (box) => {
    if (dead || clearing || paused) return;
    burst(box.pos, 255, 180, 0, 8, 320);
    k.play("hyper-ring", { volume: 0.5 });
    k.destroy(box);
    if (!hasFire) {
      hasFire = true;
      showLabel("FIRE!");
      fireBadge = k.add([
        k.text("FIRE", { font: "mania", size: 40 }),
        k.color(255, 150, 0),
        k.pos(20, 254),
      ]);
    } else {
      score += 25;
      scoreText.text = `SCORE : ${score}`;
      showLabel("+25");
    }
  });

  const dropRing = (x, y) => {
    const ring = makeRing(k.vec2(x, y));
    ring.onUpdate(() => {
      ring.move(-gameSpeed, 0);
    });
    ring.onExitScreen(() => {
      if (ring.pos.x < 0) k.destroy(ring);
    });
  };

  const spawnRing = () => {
    const baseX = k.width() + 40;
    const shape = k.randi(0, 3);
    if (shape === 0) {
      // Ground row (classic).
      for (let i = 0; i < 3; i++) dropRing(baseX + i * 70, 745);
    } else if (shape === 1) {
      // Jump arc peaking near jump apex.
      for (let i = 0; i < 5; i++) {
        dropRing(baseX + i * 70, 745 - Math.sin((Math.PI * i) / 4) * 280);
      }
    } else {
      // High row rewarding a full jump.
      for (let i = 0; i < 3; i++) dropRing(baseX + i * 70, 560);
    }

    const waitTime = k.rand(0.8, 3);
    k.wait(waitTime, spawnRing);
  };

  spawnRing();

  // Ground decorations: palms and flower tufts scrolling with the world.
  const spawnDecor = () => {
    const kind = k.randi(0, 3);
    const startPos = k.vec2(k.width() + k.rand(40, 400), 840);
    const d =
      kind === 0
        ? k.add([k.sprite("palm"), k.pos(startPos), k.scale(1.1), k.anchor("bot"), k.offscreen()])
        : k.add([k.sprite("flowers"), k.pos(startPos), k.scale(1.4), k.anchor("bot"), k.offscreen()]);
    d.onUpdate(() => {
      d.move(-gameSpeed, 0);
    });
    d.onExitScreen(() => {
      if (d.pos.x < -400) k.destroy(d);
    });
    k.wait(k.rand(1.4, 3.2), spawnDecor);
  };

  spawnDecor();
  showActCard(`ACT 1 - ${ACT_NAMES[0]}`);

  k.add([
    k.rect(1920, 300),
    k.opacity(0),
    k.area(),
    k.pos(0, 832),
    k.body({ isStatic: true }),
    "platform",
  ]);

  // Pause with P / Esc (dimmed world + resume hint).
  let paused = false;
  let pauseOverlay = null;
  let pauseDim = null;
  const setPaused = (v) => {
    if (dead || paused === v) return;
    paused = v;
    k.timeScale = paused ? 0 : 1;
    citySfx.paused = paused;
    if (paused) {
      pauseDim = k.add([
        k.rect(1920, 1080),
        k.color(0, 0, 0),
        k.opacity(0.55),
        k.pos(0, 0),
      ]);
      pauseOverlay = k.add([
        k.text("PAUSED - P to Resume - S for Settings", { font: "mania", size: 56 }),
        k.anchor("center"),
        k.pos(k.center().x, k.center().y + 230),
      ]);
    } else {
      if (pauseDim) {
        k.destroy(pauseDim);
        pauseDim = null;
      }
      if (pauseOverlay) {
        k.destroy(pauseOverlay);
        pauseOverlay = null;
      }
    }
  };
  k.onButtonPress("pause", () => setPaused(!paused));

  // Settings panel (S). Opens over a forced pause, restores after.
  let settingsPanel = null;
  let settingsPausedByPanel = false;
  const settingsText = () =>
    `SETTINGS\n1 - Sound: ${muted ? "OFF" : "ON"}\n2 - Calm mode: ${calmMode ? "ON" : "OFF"}\n3 - Chill speed: ${chillMode ? "ON" : "OFF"}\nS - Close`;
  const closeSettings = () => {
    if (!settingsPanel) return;
    k.destroy(settingsPanel);
    settingsPanel = null;
    if (settingsPausedByPanel) {
      settingsPausedByPanel = false;
      setPaused(false);
    }
  };
  k.onButtonPress("settings", () => {
    if (dead || clearing) return;
    if (settingsPanel) {
      closeSettings();
      return;
    }
    if (!paused) {
      settingsPausedByPanel = true;
      setPaused(true);
    }
    settingsPanel = k.add([
      k.text(settingsText(), { font: "mania", size: 48 }),
      k.anchor("center"),
      k.pos(k.center().x, k.center().y - 140),
    ]);
  });
  const refreshSettings = () => {
    if (settingsPanel) {
      k.destroy(settingsPanel);
      settingsPanel = k.add([
        k.text(settingsText(), { font: "mania", size: 48 }),
        k.anchor("center"),
        k.pos(k.center().x, k.center().y - 140),
      ]);
    }
  };
  k.onButtonPress("mute", () => {
    muted = !muted;
    k.setData("muted", muted);
    applyVolume();
    refreshSettings();
  });
  k.onButtonPress("opt1", () => {
    muted = !muted;
    k.setData("muted", muted);
    applyVolume();
    refreshSettings();
  });
  k.onButtonPress("opt2", () => {
    calmMode = !calmMode;
    k.setData("calm", calmMode);
    refreshSettings();
  });
  k.onButtonPress("opt3", () => {
    chillMode = !chillMode;
    k.setData("chill", chillMode);
    refreshSettings();
  });

  k.onSceneLeave(() => {
    k.timeScale = 1;
    try {
      citySfx.stop();
    } catch {
      citySfx.paused = true;
    }
  });

  k.onUpdate(() => {
    if (sonic.isGrounded()) scoreMultiplier = 0;

    // Landing puff scales with air time; run dust scales with speed.
    if (!sonic.isGrounded()) {
      if (!wasAirborne) airStart = k.time();
      wasAirborne = true;
    } else {
      if (wasAirborne && !dead) {
        const fallT = k.time() - airStart;
        const n = Math.min(12, 4 + Math.floor(fallT * 10));
        burst(k.vec2(sonic.pos.x, sonic.pos.y + 60), 235, 225, 200, n, 200 + fallT * 120);
      }
      wasAirborne = false;
      runDustT += k.dt();
      const interval = Math.max(0.1, 0.4 - gameSpeed / 4000);
      if (runDustT > interval && !dead && !clearing) {
        runDustT = 0;
        burst(k.vec2(sonic.pos.x - 30, sonic.pos.y + 60), 220, 210, 190, 2, 140);
      }
    }

    if (!clearing && !dead) {
      actTime += k.dt();
      if (actTime >= ACT_LEN) clearAct();
    }
    actBar.width = Math.floor(298 * Math.min(1, actTime / ACT_LEN));

    for (const c of clouds) {
      c.move(-40, 0);
      if (c.pos.x < -700) {
        c.pos.x = k.width() + k.rand(0, 400);
        c.pos.y = k.rand(40, 280);
      }
    }

    if (bgPieces[1].pos.x < 0) {
      bgPieces[0].moveTo(bgPieces[1].pos.x + bgPieceWidth * 2, 0);
      bgPieces.push(bgPieces.shift());
    }

    bgPieces[0].move(-100, 0);
    bgPieces[1].moveTo(bgPieces[0].pos.x + bgPieceWidth * 2, 0);

    // for jump effect
    if (!dead) {
      bgPieces[0].moveTo(bgPieces[0].pos.x, -sonic.pos.y / 10 - 50);
      bgPieces[1].moveTo(bgPieces[1].pos.x, -sonic.pos.y / 10 - 50);
    }

    if (platforms[1].pos.x < 0) {
      platforms[0].moveTo(platforms[1].pos.x + platforms[1].width * 4, 450);
      platforms.push(platforms.shift());
    }

    platforms[0].move(-gameSpeed, 0);
    platforms[1].moveTo(platforms[0].pos.x + platforms[1].width * 4, 450);
  });
}
