import * as dom from "#common/dom";
import drawer from "#common/drawer";
import * as i18n from "#common/i18n";

i18n.preload("toggle.on", "toggle.off");

const opened = new WeakSet();

let listening = false;

const input = (element) =>
  dom.query(
    ":scope > .toggle-head " +
      '.toggle-switch input[type="checkbox"]',
    element
  );

const content = (element) =>
  dom.query(":scope > .toggle-content", element);

const text = (element, enabled) => {
  const key = enabled ? "toggle.on" : "toggle.off";

  dom.set(element, "data-i18n", key);
  element.textContent = i18n.message(key) || key;
};

const update = (
  element,
  source,
  target = content(element)
) => {
  const enabled = source.checked;

  if (!target) {
    return;
  }

  target.disabled = !enabled;
  target.inert = !enabled;

  if (enabled) {
    dom.remove(element, "data-off");
  } else {
    dom.set(element, "data-off", "");
  }
};

const create = (element, source, target) => {
  const panel = dom.create("div");
  const field = dom.create("div");

  panel.className = "toggle-panel";
  field.className = "switch";
  dom.set(field, "data-background", "");

  const label = dom.create("label");
  const state = dom.create("span");
  const control = dom.create("input");

  control.type = "checkbox";
  control.checked = source.checked;

  text(state, control.checked);
  label.append(state, control);
  field.append(label);

  dom.on(control, "change", () => {
    source.checked = control.checked;
    source.dispatchEvent(
      new Event("input", { bubbles: true })
    );

    text(state, control.checked);
    update(element, source, target);
  });

  panel.append(field);

  if (target) {
    panel.append(target);
  }

  return panel;
};

const open = async (element, source) => {
  if (opened.has(element)) {
    return;
  }

  opened.add(element);
  const target = content(element);

  try {
    await drawer({
      content: create(element, source, target),
      side: "right",
      direction: "→"
    });
  } finally {
    if (target) {
      element.append(target);
    }

    opened.delete(element);
  }
};

export default function toggle(root = document) {
  const elements = root.matches?.(".toggle")
    ? [root]
    : dom.all(".toggle", root);

  elements.forEach((element) => {
    const source = input(element);

    if (source) {
      update(element, source);
    }
  });

  if (listening) {
    return;
  }

  listening = true;

  dom.on(document, "change", (event) => {
    const source = event.target;

    if (!source.matches?.(".toggle-switch input")) {
      return;
    }

    const element = source.closest(".toggle");

    if (element) {
      update(element, source);
    }
  });

  dom.on(document, "click", (event) => {
    const button = event.target.closest?.(".toggle-button");

    if (!button) {
      return;
    }

    const element = button.closest(".toggle");

    if (!element) {
      return;
    }

    const source = input(element);

    if (source) {
      open(element, source).catch(() => {});
    }
  });
}
