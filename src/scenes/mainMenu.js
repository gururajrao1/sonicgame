import k from "../kaplayCtx";

export default function mainMenu() {
  if (k.getData("best-score") == null) k.setData("best-score", 0);
  const best = k.getData("best-score") ?? 0;
  k.onButtonPress("jump", () => k.go("game"));

  const bgPieceWidth = 1920;
  const bgPieces = [
    k.add([k.sprite("chemical-bg"), k.pos(0, 0), k.scale(2), k.opacity(0.8)]),
    k.add([
      k.sprite("chemical-bg"),
      k.pos(1920, 0),
      k.scale(2),
      k.opacity(0.8),
    ]),
  ];

  const platforms = [
    k.add([k.sprite("platforms"), k.pos(0, 450), k.scale(4)]),
    k.add([k.sprite("platforms"), k.pos(384, 450), k.scale(4)]),
  ];

  const makeMenuCloud = (x, y, s = 1) => {
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
  const menuClouds = [];
  for (let i = 0; i < 3; i++) {
    menuClouds.push(
      makeMenuCloud(k.rand(0, 1920), k.rand(30, 110), k.rand(0.8, 1.1))
    );
  }

  const menuPalm = k.add([
    k.sprite("palm"),
    k.scale(1.1),
    k.anchor("bot"),
    k.pos(1650, 840),
  ]);
  const menuFlowers = k.add([
    k.sprite("flowers"),
    k.scale(1.4),
    k.anchor("bot"),
    k.pos(150, 840),
  ]);

  const title = k.add([
    k.text("SONIC RING RUN", { font: "mania", size: 96 }),
    k.anchor("center"),
    k.pos(k.center().x, 200),
  ]);

  k.add([
    k.text("Press Space/Click/Touch to Play", { font: "mania", size: 32 }),
    k.anchor("center"),
    k.pos(k.center().x, k.center().y - 200),
  ]);

  k.add([
    k.text(`BEST : ${best}  |  P: Pause  |  Rings protect you!`, {
      font: "mania",
      size: 28,
    }),
    k.anchor("center"),
    k.pos(k.center().x, k.center().y - 140),
  ]);

  k.add([
    k.text("Survive each ACT - break monitors for FIRE (F to shoot)!", {
      font: "mania",
      size: 28,
    }),
    k.anchor("center"),
    k.pos(k.center().x, k.center().y - 90),
  ]);

  // Decorative runner without physics body so it never falls.
  const menuSonic = k.add([
    k.sprite("sonic", { anim: "run" }),
    k.scale(4),
    k.anchor("center"),
    k.pos(200, 745),
  ]);
  menuSonic.play("run");

  const gameSpeed = 600;
  let menuTime = 0;
  k.onUpdate(() => {
    menuTime += k.dt();
    title.pos.y = 200 + Math.sin(menuTime * 2) * 10;

    for (const c of menuClouds) {
      c.move(-40, 0);
      if (c.pos.x < -700) {
        c.pos.x = k.width() + k.rand(0, 400);
        c.pos.y = k.rand(30, 110);
      }
    }

    if (bgPieces[1].pos.x < 0) {
      bgPieces[0].moveTo(bgPieces[1].pos.x + bgPieceWidth * 2, 0);
      bgPieces.push(bgPieces.shift());
    }

    bgPieces[0].move(-100, 0);
    bgPieces[1].moveTo(bgPieces[0].pos.x + bgPieceWidth * 2, 0);

    if (platforms[1].pos.x < 0) {
      platforms[0].moveTo(platforms[1].pos.x + platforms[1].width * 4, 450);
      platforms.push(platforms.shift());
    }

    platforms[0].move(-gameSpeed, 0);
    platforms[1].moveTo(platforms[0].pos.x + platforms[1].width * 4, 450);

    menuPalm.move(-gameSpeed, 0);
    menuFlowers.move(-gameSpeed, 0);
    if (menuPalm.pos.x < -300) menuPalm.pos.x = k.width() + 300;
    if (menuFlowers.pos.x < -200) menuFlowers.pos.x = k.width() + 200;
  });
}
