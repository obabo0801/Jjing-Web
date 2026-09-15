import context from "#common/context";
import * as dom from "#common/dom";
import * as css from "#common/css";
import * as route from "#shared/route";
import sheet from "#common/sheet";
import toast from "#common/toast";
import dialog from "#common/dialog";
import * as i18n from "#common/i18n";
import { validId } from "#shared/chatting";
import * as profile from "#common/profile";
import * as actions from "#common/profile/actions";
import * as storage from "#common/storage";
import once from "#common/once";
import mount from "#common/mount";

const opening = once();

i18n.preload(
  "chatting.copied",
  "chatting.saveFailed",
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

const remove = async (id) => {
  try {
    if (!validId(id)) {
      throw new Error("Invalid message");
    }

    const response = await fetch(`/api${route.chatting}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

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
    try {
      await navigator.clipboard.writeText(value);
      toast({ text: "chatting.copied", type: "success" });
    } catch {
      toast({ text: "chatting.copyFailed", type: "error" });
    }
  }
};

const imageBlob = async (source) => {
  const response = await fetch(source);

  if (!response.ok) throw new Error("Image fetch failed");

  return response.blob();
};

const save = async (sources) => {
  try {
    for (const source of sources) {
      const blob = await imageBlob(source);
      const url = URL.createObjectURL(blob);
      const link = dom.create("a");
      const path = new URL(source, location.href).pathname;

      link.href = url;
      link.download = path.split("/").at(-1) || "image";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch {
    toast({ text: "chatting.saveFailed", type: "error" });
  }
};

const copyImage = async (source) => {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Image clipboard unavailable");
    }

    const blob = (async () => {
      const bitmap = await createImageBitmap(await imageBlob(source));

      try {
        const canvas = dom.create("canvas");

        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d").drawImage(bitmap, 0, 0);

        return await new Promise((resolve, reject) => {
          canvas.toBlob(
            (value) => (value ? resolve(value) : reject(new Error("Image conversion failed"))),
            "image/png"
          );
        });
      } finally {
        bitmap.close();
      }
    })();

    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast({ text: "chatting.copied", type: "success" });
  } catch {
    toast({ text: "chatting.copyFailed", type: "error" });
  }
};

const item = ({ value, text, icon, run, danger = false, disabled = false }) => {
  const row = dom.create("div");
  const button = dom.create("button");

  row.className = "group-item";
  if (danger) dom.set(row, "data-danger", "");

  button.type = "button";
  button.disabled = disabled;
  dom.set(button, "data-icon", icon);
  button.toggleAttribute("data-color", !danger);

  button.textContent = text;
  dom.set(button, "data-i18n", text);
  dom.set(button, "data-response", "");
  dom.set(button, "data-layer-action", value);

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

const confirmRemove = async (message) => {
  return dialog({
    title: "chatting.removeTitle",
    content: preview(message),
    direction: "→",
    actions: [
      { text: "dialog.cancel", value: false },
      { text: "dialog.confirm", icon: "trash", value: true, data: ["data-danger"] }
    ]
  });
};

const content = (message, options, user, handlers) => {
  const element = dom.create("div");
  const items = [];

  if (options.text)
    items.push(
      item({
        value: "copy-text",
        text: "chatting.action.copyText",
        icon: "copy",
        run: () => copy(options.text)
      })
    );
  if (!options.private)
    items.push(
      item({
        value: "copy-link",
        text: "chatting.action.copyLink",
        icon: "link",
        disabled: !validId(options.url),
        run: () => copyLink(options.url)
      })
    );
  const sources = [
    ...new Set(
      [
        ...(options.attachments || [])
          .filter((entry) => entry.type === "image")
          .map((entry) => entry.image),
        options.image
      ].filter(Boolean)
    )
  ];

  if (sources.length)
    items.push(
      item({
        value: "save-image",
        text: "chatting.action.saveImage",
        icon: "download",
        run: () => save(sources)
      }),
      item({
        value: "copy-image",
        text: "chatting.action.copyImage",
        icon: "copy",
        run: () => copyImage(sources[0])
      })
    );
  if (options.removable && (!options.private || message.querySelector("[data-unread]")))
    items.push(
      item({ value: "remove", text: "chatting.action.remove", icon: "trash", danger: true })
    );
  element.className = "chatting-actions";
  element.append(preview(message), group(...items));

  let groups = [];

  const render = (value) => {
    groups.forEach((group) => group.remove());
    handlers.clear();
    groups = actions.message(
      value,
      message.closest(".chatting"),
      { ...options, hidden: storage.get(`chatting-hide:${options.id}`) === "true" },
      handlers,
      opening
    );
    element.append(...groups);
    if (element.isConnected) {
      groups.forEach((group) => mount(group));
      i18n.translate();
    }
  };

  if (user && !(options.private && options.kind === "message")) render(user);
  const off =
    user?.id && !(options.private && options.kind === "message")
      ? profile.bind(element, user.id, render)
      : () => {};

  const member = user ? actions.member(user, options.room, handlers) : null;

  if (member) element.append(member.root);

  return {
    root: element,
    off: () => {
      off();
      member?.off();
    }
  };
};

const open = async (message, options) => {
  if (opened.has(message)) {
    return;
  }

  opened.add(message);
  dom.set(message, "data-action", "");

  try {
    const handlers = new Map();
    const result =
      options.id || options.own
        ? await profile.read(options.own ? "me" : options.id, { fresh: true })
        : null;

    const user = result?.ok
      ? result.data
      : options.id
        ? { id: options.id, self: Boolean(options.own), manage: false }
        : null;

    const menu = content(message, options, user, handlers);

    let value;

    try {
      value = await sheet({ content: menu.root, direction: "↓" });
    } finally {
      menu.off();
    }

    if (value === "remove") {
      const confirmed = await confirmRemove(message);

      if (confirmed === true) {
        if (options.remove) await options.remove();
        else await remove(options.url);
      }
    }

    await handlers.get(value)?.();
  } finally {
    dom.remove(message, "data-action");
    opened.delete(message);
  }
};

export default function action(message, options) {
  context(message, () => {
    if (dom.get(message, "data-deleted") !== null) return;
    open(message, options).catch(() => {});
  });
}
