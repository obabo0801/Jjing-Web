import * as back from "#common/back";
import * as dom from "#common/dom";
import sound from "#common/sound";
import vibrate from "#common/vibrate";

const bound = new WeakSet();

let current;
let off = () => {};
let listening = false;

const source = (element) =>
  dom.query(":scope > select", element);

const menu = (element) =>
  dom.query(":scope > .select-menu", element);

const sync = (element) => {
  const input = source(element);
  const button = dom.query(
    ":scope > .select-toggle",
    element
  );
  const value = dom.query(".select-value", button);
  const option = input?.selectedOptions[0];
  const key = dom.get(option, "data-i18n");

  if (!input || !button || !value) {
    return;
  }

  value.textContent = option?.textContent ?? "";
  button.disabled = input.disabled;

  if (key) {
    dom.set(value, "data-i18n", key);
  } else {
    dom.remove(value, "data-i18n");
  }

  dom
    .all(".select-option", menu(element))
    .forEach((item) => {
      const selected =
        Number(item.dataset.index) === input.selectedIndex;

      if (selected) {
        dom.set(item, "data-selected", "");
      } else {
        dom.remove(item, "data-selected");
      }
    });
};

const close = (focus = false) => {
  if (!current) {
    return;
  }

  const element = current;
  const list = menu(element);

  current = undefined;
  off();
  off = () => {};
  dom.remove(element, "data-open");

  if (list?.matches(":popover-open")) {
    list.hidePopover();
  }

  if (focus) {
    dom
      .query(":scope > .select-toggle", element)
      ?.focus({ preventScroll: true });
  }
};

const open = (element) => {
  const input = source(element);
  const list = menu(element);

  if (!input || input.disabled || !list) {
    return;
  }

  close();
  current = element;
  dom.set(element, "data-open", "");
  list.showPopover();
  off = back.add(() => close(true));

  requestAnimationFrame(() => {
    const option =
      dom.query(
        ".select-option[data-selected]:enabled",
        list
      ) ?? dom.query(".select-option:enabled", list);

    option?.focus({ preventScroll: true });
  });
};

const choose = (button) => {
  const element = button.closest(".select");
  const input = source(element);
  const index = Number(button.dataset.index);
  const option = input?.options[index];

  if (!input || !option || option.disabled) {
    return;
  }

  const changed = input.selectedIndex !== index;

  input.selectedIndex = index;
  sync(element);
  close(true);

  if (changed) {
    input.dispatchEvent(
      new Event("input", { bubbles: true })
    );

    input.dispatchEvent(
      new Event("change", { bubbles: true })
    );
  }
};

const bind = (element) => {
  const input = source(element);

  if (!input || bound.has(input)) {
    return;
  }

  const button = dom.create("button");
  const value = dom.create("span");
  const list = dom.create("div");
  const options = [...input.options].map(
    (option, index) => {
      const item = dom.create("button");
      const key = dom.get(option, "data-i18n");

      item.type = "button";
      item.className = "select-option";
      item.dataset.index = String(index);
      item.disabled = option.disabled;
      item.textContent = option.textContent;

      if (key) {
        dom.set(item, "data-i18n", key);
      }

      return item;
    }
  );

  button.type = "button";
  button.className = "select-toggle";
  dom.set(button, "data-icon", "arrow right");

  value.className = "select-value";
  list.className = "select-menu";
  dom.set(list, "popover", "manual");
  list.append(...options);

  input.hidden = true;
  dom.query(":scope > .select-arrow", element)?.remove();
  button.append(value);
  element.append(button, list);

  bound.add(input);
  sync(element);

  dom.on(list, "toggle", (event) => {
    if (
      event.newState === "closed" &&
      current === element
    ) {
      close();
    }
  });
};

export default function select(root = document) {
  const elements = root.matches?.(".select")
    ? [root]
    : dom.all(".select", root);

  elements.forEach(bind);

  if (listening) {
    return;
  }

  listening = true;

  dom.on(document, "click", (event) => {
    const toggle = event.target.closest?.(".select-toggle");

    if (toggle) {
      const element = toggle.closest(".select");

      sound.play("click");
      vibrate.play("click");

      if (current === element) {
        close(true);
      } else {
        open(element);
      }

      return;
    }

    const option = event.target.closest?.(
      ".select-option:enabled"
    );

    if (option) {
      choose(option);
    }
  });

  dom.on(document, "change", (event) => {
    const input = event.target;

    if (!input.matches?.(".select > select")) {
      return;
    }

    sync(input.closest(".select"));
    sound.play("click");
    vibrate.play("click");
  });

  dom.on(
    document,
    "pointerdown",
    (event) => {
      if (current && !current.contains(event.target)) {
        close();
      }
    },
    true
  );
}
