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

const arrows = Object.values(directions);

const handlers = [];

let point = null;
let remove = [];

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

function threshold() {
  const { width, height } = viewport();

  return Math.min(width, height) * 0.15;
}

function trigger(x, y, event) {
  if (hasSelection() || Math.hypot(x, y) < threshold()) {
    return;
  }

  const value = arrow(x, y);

  handlers.forEach((handler) => {
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
  if (remove.length) {
    return;
  }

  const options = { passive: true };

  remove = [
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

  remove.forEach((run) => {
    run();
  });

  remove = [];
  point = null;
}

export default function swipe(direction, callback) {
  const name = String(direction).trim().toLowerCase();

  const value =
    directions[name] ??
    (arrows.includes(name) ? name : null);

  if (!value || typeof callback !== "function") {
    return () => {};
  }

  const handler = { arrow: value, callback };

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
