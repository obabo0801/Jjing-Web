const stack = [];

let watcher = null;
let moving = false;

const arm = () => {
  watcher?.destroy();
  watcher = null;

  if (!stack.length || !("CloseWatcher" in window)) {
    return;
  }

  watcher = new CloseWatcher();

  watcher.addEventListener(
    "close",
    () => {
      watcher = null;

      back().catch(console.error);
    },
    { once: true }
  );
};

const drop = (entry) => {
  const index = stack.lastIndexOf(entry);

  if (index < 0) {
    return false;
  }

  const top = index === stack.length - 1;

  stack.splice(index, 1);

  if (top && !moving) {
    arm();
  }

  return true;
};

export function add(run) {
  if (typeof run !== "function") {
    return () => {};
  }

  const entry = { run };

  stack.push(entry);

  if (!moving) {
    arm();
  }

  return () => drop(entry);
}

export function remove(run) {
  const entry = [...stack].reverse().find((item) => item.run === run);

  return entry ? drop(entry) : false;
}

export async function back() {
  if (moving) {
    return true;
  }

  const entry = stack.pop();

  if (!entry) {
    return false;
  }

  watcher?.destroy();
  watcher = null;
  moving = true;

  try {
    await entry.run();
  } finally {
    moving = false;

    arm();
  }

  return true;
}

export function clear() {
  stack.length = 0;

  watcher?.destroy();
  watcher = null;
}

export function has() {
  return stack.length > 0;
}
