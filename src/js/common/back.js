const stack = [];

let watcher = null;
let moving = false;

export function watch() {
  if (watcher || !("CloseWatcher" in window)) {
    return;
  }

  watcher = new CloseWatcher();

  watcher.addEventListener("cancel", event => {
    if (event.cancelable) {
      event.preventDefault();
    }

    back().catch(console.error);
  });

  watcher.addEventListener("close", () => {
    watcher = null;

    queueMicrotask(watch);
  });
}

export function add(run) {
  if (typeof run !== "function") {
    return () => {};
  }

  stack.push(run);

  return () => remove(run);
}

export function remove(run) {
  const index = stack.lastIndexOf(run);

  if (index < 0) {
    return false;
  }

  stack.splice(index, 1);

  return true;
}

export async function back() {
  if (moving) {
    return true;
  }

  const run = stack.pop();

  if (!run) {
    return false;
  }

  moving = true;

  try {
    await run();
  } finally {
    moving = false;
  }

  return true;
}

export function clear() {
  stack.length = 0;
}

export function has() {
  return stack.length > 0;
}
