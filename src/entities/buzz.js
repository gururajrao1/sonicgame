import k from "../kaplayCtx";

export function makeBuzz(pos) {
  return k.add([
    k.sprite("buzz"),
    k.area(),
    k.scale(2),
    k.anchor("center"),
    k.pos(pos),
    k.offscreen(),
    "enemy",
  ]);
}
