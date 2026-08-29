import { on } from "#common/dom";
import { scrollable } from "#common/scroll";

const listeners = new Set();

const hasSelection = () => {
  const selection = window.getSelection();

  return Boolean(selection && !selection.isCollapsed);
};

export function listen(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export default function drag(target = document) {
  let scroller = null;
  let pointerId = null;

  let startX = 0;
  let startY = 0;

  let scrollLeft = 0;
  let scrollTop = 0;

  let dragging = false;
  let pending = false;
  let block = false;

  const reset = () => {
    scroller = null;
    pointerId = null;
    dragging = false;
    pending = false;
  };

  const start = (event) => {
    if (
      event.shiftKey ||
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      (event.target instanceof Element &&
        event.target.closest(
          "input, select, textarea, " + "[contenteditable], .range"
        ))
    ) {
      return;
    }

    const next = scrollable(event.target);

    if (!next || (next !== target && !target.contains(next))) {
      return;
    }

    scroller = next;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    scrollLeft = scroller.scrollLeft;
    scrollTop = scroller.scrollTop;
    dragging = false;
    pending = false;
  };

  const move = (event) => {
    if (event.pointerId !== pointerId || !scroller) {
      return;
    }

    const moveX = event.clientX - startX;
    const moveY = event.clientY - startY;

    if (hasSelection()) {
      reset();
      return;
    }

    if (!dragging && Math.hypot(moveX, moveY) < 4) {
      return;
    }

    if (!dragging && !pending) {
      pending = true;
      return;
    }

    if (!dragging) {
      dragging = true;
      pending = false;
      target.setPointerCapture?.(pointerId);
    }

    scroller.scrollLeft = scrollLeft - moveX;
    scroller.scrollTop = scrollTop - moveY;
    event.preventDefault();
  };

  const end = (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }

    if (dragging) {
      const moveX = event.clientX - startX;
      const moveY = event.clientY - startY;

      block = true;

      if (event.type !== "pointercancel") {
        listeners.forEach((listener) => {
          listener(moveX, moveY, event);
        });
      }

      setTimeout(() => {
        block = false;
      });
    }

    if (target.hasPointerCapture?.(pointerId)) {
      target.releasePointerCapture(pointerId);
    }

    reset();
  };

  const click = (event) => {
    if (!block) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  const remove = [
    on(target, "pointerdown", start),
    on(target, "pointermove", move),
    on(target, "pointerup", end),
    on(target, "pointercancel", end),
    on(target, "click", click, true)
  ];

  return () => {
    remove.forEach((run) => {
      run();
    });
    reset();
  };
}
