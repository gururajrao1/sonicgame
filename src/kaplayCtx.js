import kaplay from "kaplay";

const k = kaplay({
  width: 1920,
  height: 1080,
  letterbox: true,
  background: [0, 0, 0],
  global: false,
  buttons: {
    jump: {
      keyboard: ["space", "up", "w"],
      mouse: "left",
    },
    pause: {
      keyboard: ["p", "escape"],
    },
    fire: {
      keyboard: ["f", "j", "x"],
    },
    mute: {
      keyboard: ["m"],
    },
    settings: {
      keyboard: ["s"],
    },
    opt1: {
      keyboard: ["1"],
    },
    opt2: {
      keyboard: ["2"],
    },
    opt3: {
      keyboard: ["3"],
    },
  },
  touchToMouse: true,
  debug: false,
});

export default k;
