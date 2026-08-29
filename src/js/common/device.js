import { root, on } from "#common/dom";

const portrait = matchMedia("(orientation: portrait)");
const coarse = matchMedia("(pointer: coarse)");
const touch = matchMedia("(any-pointer: coarse)");
const wearable = matchMedia("(max-width: 480px) and (max-height: 480px)");

const state = {};

let listening = false;

const sync = () => {
  state.wearable = wearable.matches && coarse.matches;
  state.mobile = !state.wearable && coarse.matches;
  state.window = !state.wearable && !state.mobile;
  state.portrait = portrait.matches;
  state.touch = touch.matches || navigator.maxTouchPoints > 0;
  Object.entries(state).forEach(([name, active]) => {
    root.classList.toggle(name, active);
  });

  return state;
};

export default function device() {
  if (!listening) {
    [portrait, coarse, touch, wearable].forEach((media) => {
      on(media, "change", sync);
    });
    listening = true;
  }

  return sync();
}
