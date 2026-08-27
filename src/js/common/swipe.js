import { on } from "#common/dom";
import { listen } from "#common/drag";
import viewport from "#common/viewport";

const directions = {
  right: "→",
  "bottom-right": "↘",
  bottom: "↓",
  "bottom-left": "↙",
  left: "←",
  "top-left": "↖",
  top: "↑",
  "top-right": "↗"
};

const vectors = {
  "→": [1, 0],
  "↘": [1, 1],
  "↓": [0, 1],
  "↙": [-1, 1],
  "←": [-1, 0],
  "↖": [-1, -1],
  "↑": [0, -1],
  "↗": [1, -1]
};

const arrows = Object.values(directions);

const handlers = [];

let point = null;
let off = [];

function hasSelection() {
  const selection = window.getSelection();

  if (selection && !selection.isCollapsed) {
    return true;
  }

  const active = document.activeElement;

  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    return active.selectionStart !== active.selectionEnd;
  }

  return false;
}

function arrow(x, y) {
  const angle = Math.atan2(y, x) / (Math.PI / 4);

  const index = (Math.round(angle) + 8) % 8;

  return arrows[index];
}

function minimum() {
  const { width, height } = viewport();

  return Math.min(width, height) * 0.15;
}

function trigger(x, y, event) {
  if (hasSelection() || Math.hypot(x, y) < minimum()) {
    return;
  }

  const value = arrow(x, y);

  [...handlers].forEach((handler) => {
    if (handler.arrow === value) {
      handler.callback(event);
    }
  });
}

function start(event) {
  if (event.touches.length !== 1 || hasSelection()) {
    point = null;

    return;
  }

  const touch = event.touches[0];

  point = {
    id: touch.identifier,
    x: touch.clientX,
    y: touch.clientY
  };
}

function end(event) {
  if (!point || hasSelection()) {
    point = null;

    return;
  }

  const touch = [...event.changedTouches].find(
    (item) => item.identifier === point.id
  );

  if (!touch) {
    return;
  }

  const x = touch.clientX - point.x;
  const y = touch.clientY - point.y;

  point = null;

  trigger(x, y, event);
}

function cancel() {
  point = null;
}

function watch() {
  if (off.length) {
    return;
  }

  const options = { passive: true };

  off = [
    on(document, "touchstart", start, options),

    on(document, "touchend", end, options),

    on(document, "touchcancel", cancel, options),

    listen((x, y, event) => {
      trigger(x, y, event);
    })
  ];
}

function unwatch() {
  if (handlers.length) {
    return;
  }

  off.forEach((run) => {
    run();
  });

  off = [];
  point = null;
}

function size(target, direction) {
  const [x, y] = vectors[direction];

  if (!y) {
    return target.clientWidth;
  }

  if (!x) {
    return target.clientHeight;
  }

  return Math.hypot(
    target.clientWidth,
    target.clientHeight
  );
}

function distance(direction, x, y) {
  const [moveX, moveY] = vectors[direction];
  const diagonal = moveX !== 0 && moveY !== 0;
  const value = x * moveX + y * moveY;

  return diagonal ? value / Math.SQRT2 : value;
}

function match(direction, x, y) {
  const horizontal = Math.abs(x) >= Math.abs(y);

  switch (direction) {
    case "←":
      return x < 0 && horizontal;

    case "→":
      return x > 0 && horizontal;

    case "↑":
      return y < 0 && !horizontal;

    case "↓":
      return y > 0 && !horizontal;

    default:
      return arrow(x, y) === direction;
  }
}

function progress(direction, options) {
  const {
    target,
    start,
    move,
    reach,
    end,
    threshold = 0.35,
    mouse = false
  } = options;

  if (!(target instanceof Element)) {
    return () => {};
  }

  let id;
  let startX = 0;
  let startY = 0;

  let moving = false;
  let reached = false;
  let value = 0;
  let dragged = false;

  const prepare = (nextId, x, y) => {
    id = nextId;
    startX = x;
    startY = y;

    moving = false;
    reached = false;
    value = 0;
  };

  const reset = () => {
    id = undefined;

    moving = false;
    reached = false;
    value = 0;
  };

  const update = (x, y, event) => {
    if (!moving) {
      if (Math.hypot(x, y) < 4) {
        return false;
      }

      if (!match(direction, x, y)) {
        return false;
      }

      moving = true;
      dragged = true;

      start?.(event);
    }

    const length = size(target, direction);

    value = length
      ? Math.min(
          1,
          Math.max(0, distance(direction, x, y) / length)
        )
      : 0;

    move?.(value, event);

    if (value < threshold) {
      reached = false;
    } else if (!reached) {
      reached = true;
      reach?.(event);
    }

    return true;
  };

  const finish = (event, cancelled = false) => {
    const active = moving;

    const complete =
      !cancelled && active && value >= threshold;

    const current = value;

    reset();

    if (active) {
      end?.(complete, current, event);
    }
  };

  const touchStart = (event) => {
    if (
      event.touches.length !== 1 ||
      hasSelection() ||
      event.target.closest?.(
        "input, select, textarea, " + "[contenteditable]"
      )
    ) {
      return;
    }

    const touch = event.touches[0];

    dragged = false;

    prepare(touch.identifier, touch.clientX, touch.clientY);
  };

  const touchMove = (event) => {
    const touch = [...event.touches].find(
      (item) => item.identifier === id
    );

    if (!touch) {
      return;
    }

    const x = touch.clientX - startX;

    const y = touch.clientY - startY;

    if (update(x, y, event)) {
      event.preventDefault();
    }
  };

  const touchEnd = (event) => {
    if (id === undefined) {
      return;
    }

    const touch = [...event.changedTouches].find(
      (item) => item.identifier === id
    );

    if (!touch) {
      return;
    }

    finish(event);
  };

  const touchCancel = (event) => {
    if (id === undefined) {
      return;
    }

    finish(event, true);
  };

  const pointerStart = (event) => {
    if (event.isPrimary) {
      dragged = false;
    }

    if (
      !mouse ||
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      hasSelection() ||
      event.target.closest?.(
        "input, select, textarea, " + "[contenteditable]"
      )
    ) {
      return;
    }

    prepare(event.pointerId, event.clientX, event.clientY);

    target.setPointerCapture?.(event.pointerId);
  };

  const pointerMove = (event) => {
    if (
      event.pointerType !== "mouse" ||
      event.pointerId !== id
    ) {
      return;
    }

    const x = event.clientX - startX;

    const y = event.clientY - startY;

    update(x, y, event);
  };

  const pointerEnd = (event) => {
    if (
      event.pointerType !== "mouse" ||
      event.pointerId !== id
    ) {
      return;
    }

    target.releasePointerCapture?.(event.pointerId);

    finish(event);
  };

  const pointerCancel = (event) => {
    if (
      event.pointerType !== "mouse" ||
      event.pointerId !== id
    ) {
      return;
    }

    finish(event, true);
  };

  const click = (event) => {
    if (!dragged) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dragged = false;
  };

  const listeners = [
    on(target, "touchstart", touchStart, { passive: true }),

    on(target, "touchmove", touchMove, { passive: false }),

    on(target, "touchend", touchEnd, { passive: true }),

    on(target, "touchcancel", touchCancel, {
      passive: true
    }),

    on(target, "pointerdown", pointerStart),

    on(target, "pointermove", pointerMove),

    on(target, "pointerup", pointerEnd),

    on(target, "pointercancel", pointerCancel),

    on(target, "click", click, true)
  ];

  return () => {
    listeners.forEach((run) => {
      run();
    });

    reset();
    dragged = false;
  };
}

function simple(direction, callback) {
  if (typeof callback !== "function") {
    return () => {};
  }

  const handler = { arrow: direction, callback };

  handlers.push(handler);

  watch();

  return () => {
    const index = handlers.indexOf(handler);

    if (index >= 0) {
      handlers.splice(index, 1);
    }

    unwatch();
  };
}

export function resolve(direction) {
  const name = String(direction).trim().toLowerCase();

  return (
    directions[name] ??
    (arrows.includes(name) ? name : null)
  );
}

export default function swipe(direction, callback) {
  const value = resolve(direction);

  if (!value) {
    return () => {};
  }

  if (callback && typeof callback === "object") {
    return progress(value, callback);
  }

  return simple(value, callback);
}
