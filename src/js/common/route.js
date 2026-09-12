import * as location from "#shared/location";

const handlers = new Map();
const active = [];

let base;

let started = false;
let syncing = false;
let again = false;
let pending;

const equal = (first, second) =>
  JSON.stringify(first) === JSON.stringify(second);

const states = () => active.map((item) => item.state);

const read = () => {
  const current = location.read(window.location.href);
  const saved = history.state?.navigation;

  if (
    saved?.url === window.location.href &&
    Array.isArray(saved.entries) &&
    saved.entries.length <= 12 &&
    saved.entries.every(
      (item) =>
        Array.isArray(item) &&
        item.length === 3 &&
        item.every((part) => typeof part === "string")
    ) &&
    equal(saved.entries.at(-1) || null, current)
  )
    return saved.entries;
  if (!current) return [];
  return current[1] === "authority"
    ? [["popover", "profile", current[2]], current]
    : [current];
};

const url = (value) => (value.length ? location.href(value.at(-1)) : base);

const write = (value, push = false) => {
  const target = url(value);
  const state = {
    ...history.state,
    navigation: {
      base,
      entries: value,
      parent: push ? window.location.href : "",
      url: new URL(target, window.location.href).href
    }
  };

  history[push ? "pushState" : "replaceState"](state, "", target);
};

export const register = (name, open, type = "popover") => {
  handlers.set(name, { open, type });
};

export const add = (state, close) => {
  base ||= "/";
  const item = { state, close };

  active.push(item);
  if (pending) {
    pending.resolve(equal(pending.state, state));
  } else if (!syncing) {
    write(states(), true);
  }

  return () => {
    const index = active.indexOf(item);

    if (index < 0) return;
    const previous = states();

    active.splice(index, 1);
    if (syncing) return;
    const parent = history.state?.navigation?.parent;

    if (
      index === previous.length - 1 &&
      equal(read(), previous) &&
      parent === new URL(url(states()), window.location.href).href
    ) {
      history.back();
    } else {
      write(states());
    }
  };
};

const sync = async () => {
  if (!started) return;
  if (syncing) {
    again = true;
    return;
  }

  syncing = true;
  try {
    do {
      again = false;
      const desired = read();

      let common = 0;

      while (
        common < active.length &&
        equal(active[common].state, desired[common])
      )
        common += 1;

      while (active.length > common) {
        const item = active.at(-1);

        if ((await item.close()) === false || active.includes(item)) {
          write(states());
          return;
        }
      }

      for (const state of desired.slice(common)) {
        if (again) break;
        const handler = handlers.get(state[1]);

        if (!handler || handler.type !== state[0]) {
          write(states());
          break;
        }

        const ready = new Promise((resolve) => {
          pending = { state, resolve };
        });
        const request = pending;

        // Factories resolve when their layer closes; wait only for mounting.
        Promise.resolve()
          .then(() => handler.open(state[2]))
          .catch(console.error)
          .finally(() => request.resolve(false));

        const opened = await ready;

        pending = undefined;
        if (!opened) {
          write(states());
          break;
        }
      }
    } while (again);
  } finally {
    syncing = false;
  }
};

export const restore = async () => {
  if (!started) {
    started = true;
    const current = new URL(window.location.href);
    const profile = location.read(current.href)?.[1] === "profile";

    if (
      current.searchParams.has("ui") ||
      (profile && current.searchParams.has("connection"))
    ) {
      current.searchParams.delete("ui");
      if (profile) current.searchParams.delete("connection");
      const state = { ...history.state };

      delete state.ui;
      history.replaceState(state, "", current);
    }
    const saved = history.state?.navigation;

    base =
      saved?.url === current.href &&
      typeof saved.base === "string" &&
      saved.base.startsWith("/") &&
      !saved.base.startsWith("//")
        ? saved.base
        : location.read(current.href)
          ? "/"
          : `${current.pathname}${current.search}${current.hash}`;
    const desired = read();

    // A direct link needs a base entry so Back closes one layer at a time.
    if (
      desired.length &&
      history.state?.navigation?.url !== window.location.href
    ) {
      write([]);
      for (let index = 1; index <= desired.length; index += 1)
        write(desired.slice(0, index), true);
    }
    window.addEventListener("popstate", () => sync().catch(console.error));
  }
  await sync();
};
