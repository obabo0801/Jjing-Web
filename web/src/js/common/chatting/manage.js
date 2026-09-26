import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as items from "#common/chatting/item";
import * as file from "#common/chatting/file";
import * as rules from "#shared/chatting";
import * as route from "#shared/route";
import * as profile from "#common/profile";
import * as actions from "#common/profile/actions";
import * as storage from "#common/storage";
import once from "#common/once";
import * as context from "#common/chatting/current";
import mount from "#common/mount";
import preview from "#common/chatting/preview";
import api from "#common/api";
import dialog from "#common/dialog";
import toast from "#common/toast";

const opening = once();
const records = new WeakMap();
const pending = new Set();

i18n.preload(
  "chatting.message",
  "image.delete",
  "image.restore",
  "restore.action",
  "restore.title",
  "restore.success",
  "restore.error",
  "chatting.removeTitle",
  "chatting.removeFailed",
  "assets.open",
  "assets.openImage",
  "chatting.action.copyText",
  "chatting.action.copyLink",
  "chatting.action.saveImage",
  "chatting.action.copyImage",
  "chatting.action.remove",
  "data.delete.confirm",
  "chatting.action.restore",
  "chatting.copyFailed",
  "dialog.cancel"
);

export const bind = (message, options) => {
  if (!records.has(message)) {
    dom.on(message, "chatting-change", (event) => {
      const value = records.get(message);

      Object.assign(value, event.detail, {
        deleted: Boolean(event.detail.deleted),
        retained: Boolean(event.detail.retained),
        restorable: Boolean(event.detail.restorable)
      });

      message.toggleAttribute("data-deleted", value.deleted);
      message.toggleAttribute("data-retained", value.retained || value.restorable);
    });
  }

  records.set(message, options);
};

export const read = (message, fallback = {}) => records.get(message) || fallback;
const deleted = (message, options) =>
  message?.hasAttribute("data-deleted") ?? Boolean(options.deleted);

const retained = (message, options) =>
  options.restorable === true ||
  options.retained === true ||
  message?.hasAttribute("data-retained") === true;

export const allowed = (message, options) =>
  deleted(message, options)
    ? retained(message, options)
    : Boolean(
        options.removable &&
        (!options.private || message?.querySelector("[data-unread]") || options.unread === true)
      );

export const link = (id, room = context.room) => {
  if (!rules.validId(id)) return "";
  const url = new URL(room ? `/rooms/${room}` : "/", location.origin);

  url.searchParams.set("message", id);

  return url.href;
};

export const copy = async (id, room) => {
  const url = link(id, room);

  if (url) return file.copy(url);

  toast({ text: "chatting.copyFailed", type: "error" });

  return false;
};

export const controls = (message, options, selected) => {
  const values = [];
  const add = (name, extra) => values.push(items.spec(name, extra));

  if (
    selected &&
    selected.open !== false &&
    (selected.kind !== "image" || typeof selected.open === "function")
  ) {
    add("open", {
      text: selected.kind === "image" ? "assets.openImage" : "assets.open",
      icon: selected.kind === "image" ? "image" : "link"
    });
  }

  if (options.text) add("text", { run: () => file.copy(options.text) });

  if (!options.private && (message || rules.validId(options.url))) {
    add("link", {
      disabled: !rules.validId(options.url),
      run: () => copy(options.url, options.room)
    });
  }

  const sources = selected
    ? selected.kind === "image"
      ? [selected.resolve || selected.url]
      : []
    : [
        ...new Set(
          [
            ...(options.attachments || [])
              .filter((entry) => ["image", "gif"].includes(entry.type))
              .map((entry) => entry.image),
            options.image
          ].filter(Boolean)
        )
      ];

  if (sources.length) {
    add("save", { run: () => file.save(sources) });
    add("image", { run: () => file.image(sources[0]) });
  }

  if (allowed(message, options)) {
    add(deleted(message, options) ? "restore" : "remove", {
      text: deleted(message, options) ? "chatting.action.restore" : "chatting.action.remove"
    });
  }

  return items.group(values);
};

export async function change(message, options, selected, quick = false) {
  if (!allowed(message, options)) return false;
  const restoring = deleted(message, options);
  const token = options.private ? options.token : options.url;
  const key = `${options.private ? "message" : "chatting"}:${token}`;

  if (!rules.validId(token) || pending.has(key)) return false;

  pending.add(key);
  try {
    const content = dom.create("div");
    const question = dom.create("p");

    dom.set(question, "data-i18n", restoring ? "restore.title" : "chatting.removeTitle");
    content.append(question, preview(message, selected?.content, selected));

    const result = await dialog({
      title:
        selected?.kind === "image"
          ? restoring
            ? "image.restore"
            : "image.delete"
          : "chatting.message",
      content,
      direction: "→",
      ready: quick
        ? (element) => {
            element.tabIndex = -1;
            element.focus({ preventScroll: true });
          }
        : undefined,
      actions: [
        items.spec("cancel", { value: false }),
        items.spec(restoring ? "restore" : "remove", {
          text: restoring ? "restore.action" : "data.delete.confirm",
          value: true
        })
      ]
    });

    if (result !== true || !allowed(message, options) || restoring !== deleted(message, options))
      return false;

    if (!restoring && typeof options.remove === "function") {
      await options.remove();
      return true;
    }

    const base = options.private
      ? `${route.chatting}/direct/message/${token}`
      : `${route.chatting}/${token}`;

    const response = await api(restoring ? `${base}/restore` : base, {
      method: restoring ? "POST" : "DELETE",
      ...(!options.private && options.room && { headers: { "X-Chatting-Room": options.room } }),
      data: {}
    });

    if (response.ok && restoring) {
      Object.assign(options, response.data, { deleted: false, restorable: false, retained: false });

      message?.dispatchEvent(new CustomEvent("chatting-change", { detail: options }));
    }

    if (restoring || !response.ok)
      toast({
        text: restoring
          ? response.ok
            ? "restore.success"
            : "restore.error"
          : "chatting.removeFailed",
        type: response.ok ? "success" : "error"
      });

    return response.ok;
  } finally {
    pending.delete(key);
  }
}

// 메시지와 선택 항목 모두 같은 공개/비공개 메뉴 조건을 사용합니다.
export async function menu(message, options = {}, selected, target) {
  const result =
    options.id || options.own
      ? await profile.read(options.own ? "me" : options.id, { fresh: true })
      : null;

  const user = result?.ok
    ? result.data
    : options.id
      ? { id: options.id, self: Boolean(options.own), manage: false }
      : null;
  const element = dom.create("div");
  const handlers = new Map();
  const context =
    message?.closest(".chatting") ||
    (options.private ? target : dom.query(".app .chatting") || target);

  element.className = selected ? "chatting-actions asset-actions" : "chatting-actions";

  element.append(
    preview(message, selected?.content, selected),
    controls(message, options, selected)
  );

  let groups = [];

  const render = (value) => {
    groups.forEach((group) => group.remove());
    handlers.clear();
    groups = actions.message(
      value,
      context,
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

  if (user) render(user);
  const off = user?.id ? profile.bind(element, user.id, render) : () => {};
  const member = user && options.private ? actions.member(user, options.room, handlers) : null;

  if (member) element.append(member.root);

  return {
    root: element,
    run: async (value) => {
      if (value === "remove" || value === "restore") {
        return change(message, options, selected);
      }

      return handlers.get(value)?.();
    },
    off: () => {
      off();
      member?.off();
    }
  };
}
