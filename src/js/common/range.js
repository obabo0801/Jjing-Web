import * as dom from "#common/dom";

const bound = new WeakSet();

const paint = (input) => {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value);
  const size = max - min;

  const percent = size
    ? Math.min(
        100,
        Math.max(0, ((value - min) / size) * 100)
      )
    : 0;

  const container = input.closest(".range");

  const fill = dom.query(".range-fill", container);

  const thumb = dom.query(".range-thumb", container);

  if (fill) {
    fill.style.width = `${percent}%`;
  }

  if (thumb) {
    thumb.style.insetInlineStart = `${percent}%`;
  }
};

const drag = (input) => {
  const container = input.closest(".range");

  if (!container) {
    return;
  }

  let pointer;

  dom.on(input, "pointerdown", (event) => {
    pointer = { id: event.pointerId, x: event.clientX };

    input.setPointerCapture(event.pointerId);
  });

  dom.on(input, "pointermove", (event) => {
    if (
      !pointer ||
      event.pointerId !== pointer.id ||
      Math.abs(event.clientX - pointer.x) < 4
    ) {
      return;
    }

    dom.set(container, "data-drag", "");
  });

  const stop = (event) => {
    if (pointer && event.pointerId !== pointer.id) {
      return;
    }

    pointer = undefined;

    dom.remove(container, "data-drag");
  };

  dom.on(input, "pointerup", stop);
  dom.on(input, "pointercancel", stop);
  dom.on(input, "lostpointercapture", stop);
};

export default function range(root = document) {
  dom
    .all('.range input[type="range"]', root)
    .forEach((input) => {
      paint(input);

      if (bound.has(input)) {
        return;
      }

      dom.on(input, "input", () => paint(input));

      drag(input);
      bound.add(input);
    });
}
