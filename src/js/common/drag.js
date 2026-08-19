import { on } from "#common/event";
import { scrollable } from "#common/scroll";

const ignore = "input, select, textarea, " + "[contenteditable], .range";

const listeners = new Set();

function selected() {
  const selection = window.getSelection();

  return selection && !selection.isCollapsed;
}

export function listen(run) {
  if (typeof run !== "function") {
    return () => {};
  }

  listeners.add(run);

  return () => {
    listeners.delete(run);
  };
}

export function bind(target = document) {
  let scroll = null;
  let id = null;

  let x = 0;
  let y = 0;

  let left = 0;
  let top = 0;

  let moved = false;
  let pending = false;
  let block = false;

  const down = (event) => {
    if (
      event.shiftKey ||
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest(ignore))
    ) {
      return;
    }

    const item = scrollable(event.target);

    if (!item || (item !== target && !target.contains(item))) {
      return;
    }

    scroll = item;
    id = event.pointerId;

    x = event.clientX;
    y = event.clientY;

    left = scroll.scrollLeft;
    top = scroll.scrollTop;

    moved = false;
    pending = false;
  };

  const move = (event) => {
    if (event.pointerId !== id || !scroll) {
      return;
    }

    const dx = event.clientX - x;
    const dy = event.clientY - y;

    if (selected()) {
      scroll = null;
      id = null;
      pending = false;

      return;
    }

    if (!moved && Math.hypot(dx, dy) < 4) {
      return;
    }

    if (!moved && !pending) {
      pending = true;

      return;
    }

    if (!moved) {
      if (selected()) {
        scroll = null;
        id = null;
        pending = false;

        return;
      }

      moved = true;
      pending = false;

      target.setPointerCapture?.(id);
    }

    scroll.scrollLeft = left - dx;
    scroll.scrollTop = top - dy;

    event.preventDefault();
  };

  const end = (event, emit = true) => {
    if (event.pointerId !== id) {
      return;
    }

    if (moved) {
      const dx = event.clientX - x;
      const dy = event.clientY - y;

      block = true;

      if (emit) {
        listeners.forEach((run) => {
          run(dx, dy, event);
        });
      }

      setTimeout(() => {
        block = false;
      });
    }

    if (target.hasPointerCapture?.(id)) {
      target.releasePointerCapture(id);
    }

    scroll = null;
    id = null;
  };

  const click = (event) => {
    if (!block) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  const stop = [
    on(target, "pointerdown", down),
    on(target, "pointermove", move),
    on(target, "pointerup", end),
    on(target, "pointercancel", (event) => {
      end(event, false);
    }),
    on(target, "click", click, true)
  ];

  return () => {
    stop.forEach((run) => run());

    scroll = null;
    id = null;
  };
}
