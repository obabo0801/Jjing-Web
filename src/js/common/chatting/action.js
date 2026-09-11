import * as dom from "#common/dom";
import * as css from "#common/css";
import * as route from "#shared/route";
import sheet from "#common/sheet";
import toast from "#common/toast";
import dialog from "#common/dialog";
import * as i18n from "#common/i18n";
import { validId } from "#shared/chatting";
import report from "#common/report";

i18n.preload(
  "chatting.copied",
  "chatting.copyFailed",
  "chatting.removeSuccess",
  "chatting.removeFailed",
  "chatting.removeTitle",
  "dialog.cancel",
  "dialog.confirm"
);

export const link = (id) => {
  if (!validId(id)) return "";
  const url = new URL("/", location.origin);

  url.searchParams.set("message", id);
  return url.href;
};

export const copyLink = async (id) => {
  try {
    const url = link(id);

    if (!url) throw new Error("Unstored message");
    await navigator.clipboard.writeText(url);
    toast({ text: "chatting.copied", type: "success" });
    return true;
  } catch {
    toast({ text: "chatting.copyFailed", type: "error" });
    return false;
  }
};

const confirmRemove = async () => {
  return dialog({
    title: "chatting.removeTitle",
    actions: [
      { text: "dialog.cancel", value: false },
      {
        text: "dialog.confirm",
        icon: "trash",
        value: true,
        data: ["data-danger"]
      }
    ]
  });
};

const remove = async (id) => {
  try {
    if (!validId(id)) {
      throw new Error("Invalid message");
    }

    const response = await fetch(
      `/api${route.chatting}/${encodeURIComponent(id)}`,
      { method: "DELETE", credentials: "same-origin" }
    );

    if (!response.ok) {
      throw new Error("Message remove failed");
    }

    toast({ text: "chatting.removeSuccess", type: "success" });

    return true;
  } catch {
    toast({ text: "chatting.removeFailed", type: "error" });

    return false;
  }
};

const opened = new WeakSet();

const copy = async (value) => {
  if (value) {
    await navigator.clipboard.writeText(value);
  }
};

const save = async (source) => {
  const response = await fetch(source);

  if (!response.ok) {
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = dom.create("a");
  const path = new URL(source, location.href).pathname;

  link.href = url;
  link.download = path.split("/").at(-1) || "image";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url));
};

const item = ({ value, text, icon, run, danger = false, disabled = false }) => {
  const row = dom.create("div");
  const button = dom.create("button");

  row.className = "group-item";
  button.type = "button";
  button.textContent = text;
  button.disabled = disabled;

  dom.set(button, "data-icon", icon);
  dom.set(button, "data-i18n", text);
  dom.set(button, "data-response", "");
  dom.set(button, "data-layer-action", value);

  if (danger) {
    dom.set(row, "data-danger", "");
  }

  dom.on(button, "click", () => {
    if (button.disabled) return;
    Promise.resolve(run?.()).catch(() => {});
  });

  row.append(button);
  return row;
};

const group = (...items) => {
  const element = dom.create("div");

  element.className = "group";
  element.append(...items);

  return element;
};

const preview = (message) => {
  const element = dom.create("div");
  const clone = message.cloneNode(true);
  const source = [message, ...dom.all("*", message)];
  const targets = [clone, ...dom.all("*", clone)];
  const mode = dom.get(message.closest(".chatting"), "data-chatting");

  element.className = "chatting chatting-preview";
  dom.set(element, "data-chatting", mode || "stream");
  clone.inert = true;
  dom.remove(clone, "data-follow");

  targets.forEach((target, index) => {
    css.copy(source[index], target);

    for (const name of [
      "id",
      "autofocus",
      "tabindex",
      "data-response",
      "data-action",
      "data-layer-action"
    ]) {
      dom.remove(target, name);
    }
  });

  element.append(clone);
  return element;
};

const content = (message, options) => {
  const element = dom.create("div");
  const items = [
    item({
      value: "copy-text",
      text: "chatting.action.copyText",
      icon: "copy",
      disabled: !options.text,
      run: () => copy(options.text)
    })
  ];

  if (options.image) {
    items.push(
      item({
        value: "save-image",
        text: "chatting.action.saveImage",
        icon: "download",
        run: () => save(options.image)
      }),
      item({
        value: "copy-image",
        text: "chatting.action.copyImage",
        icon: "link",
        run: () => copy(options.image)
      })
    );
  }

  items.push(
    item({
      value: "copy-link",
      text: "chatting.action.copyLink",
      icon: "link",
      disabled: !validId(options.url),
      run: () => copyLink(options.url)
    })
  );

  const moderation = [];

  if (options.removable) {
    moderation.push(
      item({
        value: "remove",
        text: "chatting.action.remove",
        icon: "trash",
        danger: true
      })
    );
  }

  moderation.push(
    item({
      value: "report",
      text: "chatting.action.report",
      icon: "flag",
      danger: true,
      disabled: Boolean(options.own) || !validId(options.url)
    })
  );

  element.className = "chatting-actions";
  element.append(preview(message), group(...items), group(...moderation));

  return element;
};

const open = async (message, options) => {
  if (opened.has(message)) {
    return;
  }

  opened.add(message);
  dom.set(message, "data-action", "");

  try {
    const value = await sheet({
      content: content(message, options),
      direction: "↓"
    });

    if (value === "remove") {
      const confirmed = await confirmRemove();

      if (confirmed === true) {
        await remove(options.url);
      }
    }

    if (value === "report") {
      await report("message", options.url, options.own);
    }
  } finally {
    dom.remove(message, "data-action");
    opened.delete(message);
  }
};

export default function action(message, options) {
  let timer;
  let pointer;
  let held = false;

  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
    pointer = undefined;
  };

  const show = () => {
    if (dom.get(message, "data-deleted") !== null) {
      return;
    }

    open(message, options).catch(() => {});
  };

  dom.on(message, "pointerdown", (event) => {
    if (event.target.closest?.("audio")) return;
    if (event.pointerType === "mouse") {
      return;
    }

    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };

    timer = setTimeout(() => {
      held = true;
      timer = undefined;
      show();
    }, 500);
  });

  dom.on(message, "pointermove", (event) => {
    if (!pointer || event.pointerId !== pointer.id) {
      return;
    }

    const x = event.clientX - pointer.x;
    const y = event.clientY - pointer.y;

    if (Math.hypot(x, y) > 10) {
      clear();
    }
  });

  dom.on(message, "pointerup", () => {
    clear();

    if (held) {
      setTimeout(() => {
        held = false;
      });
    }
  });

  dom.on(message, "pointercancel", clear);

  dom.on(
    message,
    "click",
    (event) => {
      if (!held) {
        return;
      }

      held = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  dom.on(message, "contextmenu", (event) => {
    if (event.target.closest?.("audio")) return;
    event.preventDefault();
    show();
  });
}
