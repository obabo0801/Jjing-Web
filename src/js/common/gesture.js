import { on } from "#common/event";

const items = [];

let points = [];
let id = null;
let stop = [];

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function length(points) {
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
  }

  return total;
}

function sample(points, count = 32) {
  const total = length(points);

  if (!total) {
    return points;
  }

  const gap = total / (count - 1);
  const result = [points[0]];

  let current = points[0];
  let index = 1;
  let moved = 0;

  while (index < points.length && result.length < count - 1) {
    const next = points[index];
    const size = distance(current, next);

    if (!size) {
      current = next;
      index++;

      continue;
    }

    if (moved + size >= gap) {
      const rate = (gap - moved) / size;

      current = {
        x: current.x + (next.x - current.x) * rate,
        y: current.y + (next.y - current.y) * rate
      };

      result.push(current);
      moved = 0;
    } else {
      moved += size;
      current = next;
      index++;
    }
  }

  result.push(points.at(-1));

  return result;
}

function turn(a, b, c) {
  const ax = a.x - b.x;
  const ay = a.y - b.y;

  const cx = c.x - b.x;
  const cy = c.y - b.y;

  const size = Math.hypot(ax, ay) * Math.hypot(cx, cy);

  if (!size) {
    return 0;
  }

  const value = Math.max(-1, Math.min(1, (ax * cx + ay * cy) / size));

  return 180 - (Math.acos(value) * 180) / Math.PI;
}

function corners(points) {
  const count = points.length;
  const marked = [];

  for (let i = 0; i < count; i++) {
    const before = points[(i - 2 + count) % count];

    const after = points[(i + 2) % count];

    marked.push(turn(before, points[i], after) > 45);
  }

  let result = 0;

  marked.forEach((active, index) => {
    const previous = marked[(index - 1 + count) % count];

    if (active && !previous) {
      result++;
    }
  });

  return result;
}

function detect(points) {
  if (points.length < 8) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const size = Math.max(width, height);

  if (size < 48 || Math.min(width, height) < size * 0.35) {
    return null;
  }

  if (distance(points[0], points.at(-1)) > Math.max(32, size * 0.35)) {
    return null;
  }

  if (length(points) < size * 2) {
    return null;
  }

  const path = sample([...points, points[0]]).slice(0, -1);

  const count = corners(path);

  if (count === 3) {
    return "△";
  }

  if (count === 4) {
    return "□";
  }

  if (count <= 2) {
    return "○";
  }

  return null;
}

function trigger(event) {
  const value = detect(points);

  points = [];
  id = null;

  if (!value) {
    return;
  }

  items
    .filter((item) => item.shape === value)
    .forEach((item) => item.run(event));
}

function start(event) {
  if (event.touches.length !== 1) {
    points = [];
    id = null;

    return;
  }

  const touch = event.touches[0];

  id = touch.identifier;

  points = [{ x: touch.clientX, y: touch.clientY }];
}

function move(event) {
  if (id === null) {
    return;
  }

  const touch = [...event.touches].find((item) => item.identifier === id);

  if (!touch) {
    return;
  }

  const point = { x: touch.clientX, y: touch.clientY };

  if (distance(points.at(-1), point) >= 4) {
    points.push(point);
  }
}

function end(event) {
  if (id === null) {
    return;
  }

  const touch = [...event.changedTouches].find(
    (item) => item.identifier === id
  );

  if (!touch) {
    return;
  }

  points.push({ x: touch.clientX, y: touch.clientY });

  trigger(event);
}

function down(event) {
  if (
    !event.isPrimary ||
    event.pointerType !== "mouse" ||
    event.button !== 0 ||
    !event.shiftKey
  ) {
    return;
  }

  id = event.pointerId;

  points = [{ x: event.clientX, y: event.clientY }];
}

function drag(event) {
  if (event.pointerType !== "mouse" || event.pointerId !== id) {
    return;
  }

  const point = { x: event.clientX, y: event.clientY };

  if (distance(points.at(-1), point) >= 4) {
    points.push(point);
  }
}

function up(event) {
  if (event.pointerType !== "mouse" || event.pointerId !== id) {
    return;
  }

  points.push({ x: event.clientX, y: event.clientY });

  trigger(event);
}

function cancel(event) {
  if (
    "pointerType" in event &&
    (event.pointerType !== "mouse" || event.pointerId !== id)
  ) {
    return;
  }

  points = [];
  id = null;
}

function watch() {
  if (stop.length) {
    return;
  }

  const options = { passive: true };

  stop = [
    on(document, "touchstart", start, options),
    on(document, "touchmove", move, options),
    on(document, "touchend", end, options),
    on(document, "touchcancel", cancel, options),

    on(document, "pointerdown", down),
    on(document, "pointermove", drag),
    on(document, "pointerup", up),
    on(document, "pointercancel", cancel)
  ];
}

function unwatch() {
  if (items.length) {
    return;
  }

  stop.forEach((run) => run());

  stop = [];
  points = [];
  id = null;
}

export default function gesture(value, run) {
  const shape = String(value).trim();

  if (!["○", "△", "□"].includes(shape) || typeof run !== "function") {
    return () => {};
  }

  const item = { shape, run };

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
