import { on } from "#common/event";
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
const items = [];

let point = null;
let stop = [];

function selected() {
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

function direction(x, y) {
  const angle = Math.atan2(y, x) / (Math.PI / 4);

  const index = (Math.round(angle) + 8) % 8;

  return arrows[index];
}

function distance() {
  const { width, height } = viewport();

  return Math.min(width, height) * 0.15;
}

function trigger(x, y, event) {
  if (selected()) {
    return;
  }

  if (Math.hypot(x, y) < distance()) {
    return;
  }

  const value = direction(x, y);

  items
    .filter((item) => item.direction === value)
    .forEach((item) => item.run(event));
}

function start(event) {
  if (event.touches.length !== 1 || selected()) {
    point = null;
    return;
  }

  const touch = event.touches[0];

  point = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
}

function end(event) {
  if (!point || selected()) {
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
  if (stop.length) {
    return;
  }

  const options = { passive: true };

  stop = [
    on(document, "touchstart", start, options),
    on(document, "touchend", end, options),
    on(document, "touchcancel", cancel, options),

    listen((x, y, event) => {
      trigger(x, y, event);
    })
  ];
}

function unwatch() {
  if (items.length) {
    return;
  }

  stop.forEach((run) => run());

  stop = [];
  point = null;
}

export default function swipe(value, run) {
  const key = String(value).trim().toLowerCase();

  const dir = directions[key] ?? (arrows.includes(key) ? key : null);

  if (!dir || typeof run !== "function") {
    return () => {};
  }

  const item = { direction: dir, run };

  items.push(item);
  watch();

  return () => {
    const index = items.indexOf(item);

    if (index >= 0) {
      items.splice(index, 1);
    }

    unwatch();
  };
}
