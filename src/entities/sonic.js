import k from "../kaplayCtx";

export function makeSonic(pos) {
  const sonic = k.add([
    k.sprite("sonic", { anim: "run" }),
    k.scale(4),
    k.area(),
    k.anchor("center"),
    k.pos(pos),
    k.body({ jumpForce: 1320 }),
    k.opacity(1),
    "sonic",
  ]);

  sonic.ringCollectUI = sonic.add([
    k.text("", { font: "mania", size: 24 }),
    k.anchor("center"),
    k.pos(0, -80),
  ]);

  // Coyote time + jump buffer windows (seconds).
  const COYOTE = 0.1;
  const BUFFER = 0.12;
  let lastGrounded = -10;
  let bufferedAt = -10;

  const tryJump = () => {
    const now = k.time();
    if (sonic.isGrounded() || now - lastGrounded < COYOTE) {
      sonic.jump();
      sonic.play("jump");
      k.play("jump", { volume: 0.4 });
      bufferedAt = -10;
      return true;
    }
    return false;
  };

  sonic.setControls = () => {
    k.onButtonPress("jump", () => {
      bufferedAt = k.time();
      tryJump();
    });
    // Variable jump height: release cuts upward velocity.
    if (k.onButtonRelease) {
      k.onButtonRelease("jump", () => {
        if (!sonic.isGrounded() && sonic.vel && sonic.vel.y < -400) {
          sonic.vel.y = -400;
        }
      });
    }
  };

  sonic.setEvents = () => {
    sonic.onGround(() => {
      sonic.play("run");
    });
  };

  sonic.onUpdate(() => {
    if (sonic.isGrounded()) lastGrounded = k.time();
    else if (k.time() - bufferedAt < BUFFER) tryJump();
  });

  return sonic;
}
