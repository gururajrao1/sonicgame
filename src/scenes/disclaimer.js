import k from "../kaplayCtx";

export default function disclaimer() {
  k.add([
    k.text("SONIC RING RUN", { font: "mania", size: 72 }),
    k.anchor("center"),
    k.pos(k.center().x, k.center().y - 200),
  ]);

  k.add([
    k.text("A fan-made Sonic-style runner. Rings protect you from one hit.", {
      font: "mania",
      size: 28,
    }),
    k.anchor("center"),
    k.pos(k.center().x, k.center().y - 100),
  ]);

  k.add([
    k.text("Space / Up / W / Click / Tap: Jump  |  F: Fire  |  P / Esc: Pause", {
      font: "mania",
      size: 28,
    }),
    k.anchor("center"),
    k.pos(k.center().x, k.center().y - 40),
  ]);

  k.add([
    k.text("Press Space/Click/Touch to Start The Game", {
      font: "mania",
      size: 48,
    }),
    k.anchor("center"),
    k.pos(k.center().x, k.center().y + 80),
  ]);

  // Portrait phones get a rotate hint (best played landscape).
  try {
    if (window.innerWidth < window.innerHeight) {
      k.add([
        k.text("Tip: rotate your phone sideways for the full view", {
          font: "mania",
          size: 28,
        }),
        k.anchor("center"),
        k.pos(k.center().x, k.center().y + 160),
      ]);
    }
  } catch {
    /* no window */
  }

  k.onButtonPress("jump", () => k.go("main-menu"));
}
