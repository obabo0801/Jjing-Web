import * as dom from "#common/dom";

let dialog;
let backdrop;
let black = false;
let count = 0;
const create = () => {
  const wrap = dom.create("div");
  const element = dom.create("dialog");

  dom.set(element, "data-loading", "");
  dom.set(element, "closedby", "none");
  dom.on(element, "cancel", (event) =>
    event.preventDefault()
  );
  dom.on(element, "close", () => {
    backdrop?.cancel();
    backdrop = undefined;
    black = false;
  });
  wrap.append(element);
  dom.body.append(wrap);

  return element;
};
const getAnimation = (dark = false) => {
  if (!dialog) {
    return null;
  }

  if (backdrop && black === dark) {
    return backdrop;
  }

  backdrop?.cancel();
  black = dark;

  const theme = getComputedStyle(dom.root);
  const shade = theme.getPropertyValue("--shade").trim();
  const start = dark ? "#000000" : shade;
  const end = "#00000014";

  backdrop = dialog.animate(
    [{ backgroundColor: start }, { backgroundColor: end }],
    {
      duration: 1,
      fill: "both",
      pseudoElement: "::backdrop"
    }
  );
  backdrop.pause();

  return backdrop;
};

export const light = (value = 0, dark = false) => {
  const animation = getAnimation(dark);

  if (!animation) {
    return;
  }

  const progress = Math.min(
    1,
    Math.max(0, Number(value) || 0)
  );

  animation.pause();
  animation.currentTime = progress;
};

export default function loading() {
  dialog ??= create();
  count += 1;

  if (!dialog.open) {
    dialog.showModal();
    light();
  }

  let closed = false;

  return () => {
    if (closed) {
      return;
    }

    closed = true;
    count = Math.max(0, count - 1);

    if (!count && dialog.open) {
      dialog.close();
    }
  };
}
