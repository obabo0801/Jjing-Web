import * as back from "#common/back";
import * as dom from "#common/dom";
import sound from "#common/sound";
import vibrate from "#common/vibrate";

const states = new WeakMap();
let active = null;
const dismiss = () => {
  const column = active?.column;

  if (!column) {
    return;
  }

  active.close?.(column);
  active = null;
};

dom.on(document, "visibilitychange", () => {
  if (document.hidden) {
    dismiss();
  }
});

dom.on(window, "pagehide", dismiss);

const empty = Object.freeze({
  show() {},
  hide() {},
  submit() {},
  update() {}
});
const columns = (root) =>
  dom
    .all(".picker-column", root)
    .filter(
      (column) => dom.get(column, "data-min") !== null
    );
const selected = (column) =>
  dom.query("button[data-selected]", column);
const reveal = (picker) => {
  if (dom.has("wearable")) {
    return;
  }

  picker.scrollIntoView({
    behavior: "auto",
    block: "nearest",
    inline: "nearest"
  });
};
const write = (input, value) => {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const length = input.value.length - end + start + 1;

  if (length <= input.maxLength) {
    input.setRangeText(value, start, end, "end");
  }
};
const erase = (input) => {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const from =
    start === end ? Math.max(0, start - 1) : start;

  input.setRangeText("", from, end, "end");
};

export default function keypad(root, actions = {}) {
  if (!root) {
    return empty;
  }

  if (states.has(root)) {
    return states.get(root);
  }

  const element = dom.create("div");

  element.className = "keypad";

  const state = { element, column: null, ...actions };
  let off;
  const keys = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9"
  ];

  keys.forEach((value) => {
    const button = dom.create("button");

    button.type = "button";
    button.value = value;
    button.textContent = value;
    dom.set(button, "data-background", "");
    element.append(button);
  });

  const key = dom.create("button");

  key.type = "button";
  key.className = "keypad-back";
  key.value = "delete";
  dom.set(key, "data-background", "");
  dom.set(key, "data-icon", "delete");
  element.append(key);

  const zero = dom.create("button");

  zero.type = "button";
  zero.value = "0";
  zero.textContent = "0";
  dom.set(zero, "data-background", "");
  element.append(zero);

  const action = dom.create("button");

  action.type = "button";
  action.className = "keypad-action";
  action.value = "action";
  action.disabled = true;
  dom.set(action, "data-background", "");
  dom.set(action, "data-icon", "arrow");
  element.append(action);

  if (dom.has("wearable")) {
    dom.set(key, "data-circle", "");
    dom.set(action, "data-circle", "");
  }

  const update = (column) => {
    const input = dom.query(".picker-input", column);

    if (!input) {
      return;
    }

    const filled = input.value.trim().length > 0;
    const valid = filled && (state.valid?.(input) ?? true);
    const icon = filled ? "delete" : "close";

    key.value = icon;
    action.disabled = !valid;
    dom.set(key, "data-icon", icon);
  };
  const fit = () => {
    if (dom.has("wearable")) {
      return;
    }

    const height = element.scrollHeight;

    dom.root.style.setProperty(
      "--keypad-height",
      `${height}px`
    );
    reveal(root);
  };
  const show = (column) => {
    if (active && active !== state) {
      dismiss();
    }

    active = state;

    const list = columns(root);
    const icon = list.at(-1) === column ? "check" : "arrow";
    const opened = dom.get(element, "data-open") !== null;

    state.column = column;
    dom.remove(element, "data-close");

    off?.();
    off = back.add(() => {
      state.close?.(column);
    });

    dom.set(action, "data-icon", icon);
    update(column);

    if (opened) {
      return;
    }

    requestAnimationFrame(() => {
      if (state.column === column) {
        dom.set(element, "data-open", "");
        requestAnimationFrame(() => {
          if (state.column === column) {
            fit();
          }
        });
      }
    });
  };
  const hide = (column) => {
    if (state.column !== column) {
      return;
    }

    off?.();
    off = undefined;
    state.column = null;

    if (active === state) {
      active = null;
    }

    dom.set(element, "data-close", "");
    dom.remove(element, "data-open");

    const animations = element
      .getAnimations()
      .map((animation) => animation.finished);

    Promise.allSettled(animations).then(() => {
      if (dom.get(element, "data-open") !== null) {
        return;
      }

      dom.remove(element, "data-close");
      dom.root.style.removeProperty("--keypad-height");
    });
  };
  const submit = (column) => {
    if (action.disabled) {
      return;
    }

    const list = columns(root);
    const next = list[list.indexOf(column) + 1];

    if (!next) {
      state.commit?.(column);
      return;
    }

    state.commit?.(column, true);
    state.edit?.(next, selected(next));
  };

  state.show = show;
  state.hide = hide;
  state.submit = submit;
  state.update = update;

  const resize = () => {
    if (
      state.column &&
      dom.get(element, "data-open") !== null
    ) {
      fit();
    }
  };

  dom.on(window, "resize", resize);
  dom.on(window.visualViewport, "resize", resize);

  dom.on(element, "pointerdown", (event) => {
    event.preventDefault();
  });

  dom.on(element, "click", (event) => {
    const button = event.target.closest("button");
    const column = state.column;

    if (!button || !column) {
      return;
    }

    const input = dom.query(".picker-input", column);

    if (!input) {
      return;
    }

    sound.play("click");
    vibrate.play("click");

    if (button.value === "close") {
      state.close?.(column);
      return;
    }

    if (button.value === "delete") {
      erase(input);
      update(column);
      return;
    }

    if (button.value === "action") {
      submit(column);
      return;
    }

    write(input, button.value);
    update(column);
  });

  const boundary = root.closest("dialog") ?? document;

  dom.on(boundary, "click", (event) => {
    const column = state.column;
    const target = event.target;

    if (
      !column ||
      element.contains(target) ||
      root.contains(target)
    ) {
      return;
    }

    state.close?.(column);
  });

  root.after(element);
  states.set(root, state);

  return state;
}
