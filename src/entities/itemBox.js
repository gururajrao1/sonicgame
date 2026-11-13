import k from "../kaplayCtx";

export function makeMonitor(pos) {
  return k.add([
    k.sprite("monitor"),
    k.area(),
    k.scale(2),
    k.anchor("center"),
    k.pos(pos),
    k.offscreen(),
    "itembox",
  ]);
}
