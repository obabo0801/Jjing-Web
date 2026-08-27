import * as dom from "#common/dom";

let dialog;
let offKeydown;
let backdrop;
let count = 0;

const keydown = (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "a"
  ) {
    event.preventDefault();
  }
};

const create = () => {
  const element = dom.create("dialog");

  dom.set(element, "data-loading", "");

  dom.on(element, "cancel", (event) => {
    event.preventDefault();
  });

  dom.on(element, "close", () => {
    backdrop?.cancel();

    backdrop = undefined;

    offKeydown?.();
    offKeydown = undefined;
  });

  dom.body.append(element);

  return element;
};

const getAnimation = () => {
  if (!dialog) {
    return null;
  }

  if (!backdrop) {
    backdrop = dialog.animate(
      [
        { backgroundColor: "rgb(0 0 0 / 32%)" },
        { backgroundColor: "rgb(0 0 0 / 8%)" }
      ],
      {
        duration: 1,
        fill: "both",
        pseudoElement: "::backdrop"
      }
    );

    backdrop.pause();
  }

  return backdrop;
};

export const light = (value = 0) => {
  const animation = getAnimation();

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

export default function loading(icon) {
  dialog ??= create();

  count += 1;

  if (icon) {
    dom.set(dialog, "data-icon", icon);
  } else {
    dom.remove(dialog, "data-icon");
  }

  if (!dialog.open) {
    offKeydown = dom.on(document, "keydown", keydown, {
      capture: true
    });

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
