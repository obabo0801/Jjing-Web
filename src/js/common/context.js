import * as dom from "#common/dom";

export default function context(message, show) {
  let timer;
  let pointer;
  let held = false;

  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
    pointer = undefined;
  };

  dom.on(message, "pointerdown", (event) => {
    if (event.target.closest?.("audio")) return;
    if (event.pointerType === "mouse") {
      return;
    }

    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };

    timer = setTimeout(() => {
      held = true;
      timer = undefined;
      show();
    }, 500);
  });

  dom.on(message, "pointermove", (event) => {
    if (!pointer || event.pointerId !== pointer.id) {
      return;
    }

    const x = event.clientX - pointer.x;
    const y = event.clientY - pointer.y;

    if (Math.hypot(x, y) > 10) {
      clear();
    }
  });

  dom.on(message, "pointerup", () => {
    clear();

    if (held) {
      setTimeout(() => {
        held = false;
      });
    }
  });

  dom.on(message, "pointercancel", clear);

  dom.on(
    message,
    "click",
    (event) => {
      if (!held) {
        return;
      }

      held = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  dom.on(message, "contextmenu", (event) => {
    if (event.target.closest?.("audio")) return;
    event.preventDefault();
    show();
  });
}
