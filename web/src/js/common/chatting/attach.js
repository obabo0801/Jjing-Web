import * as dom from "#common/dom";
import upload from "#common/upload";
import { chatting as path } from "#shared/route";
import { validId } from "#shared/chatting";
import * as i18n from "#common/i18n";
import * as input from "#common/input";
import * as rules from "#shared/attach";
import maximum from "#shared/upload";
import avatar from "#common/avatar";
import edit from "#common/image";
import sheet from "#common/sheet";
import dialog from "#common/dialog";
import toast from "#common/toast";
import * as giphy from "#common/giphy";
import * as chat from "#common/chatting";
import * as profile from "#common/profile";
import progress from "#common/progress";
import * as recent from "./recent.js";

i18n.preload(
  "chatting.sending",
  "chatting.failed",
  "chatting.attach.limit",
  "chatting.attach.description",
  "chatting.attach.spoiler",
  "chatting.attach.remove",
  "image.title",
  "image.sizeError",
  "image.loadError",
  "image.cancel",
  "image.confirm",
  "chatting.attach.clipboard"
);

export default function attachments(field) {
  const form = field.form;
  const root = dom.create("div");
  const items = [];
  const editor = field.nextElementSibling?.matches(".chatting-editor")
    ? field.nextElementSibling
    : field;

  let busy = false;
  let destroyed = false;

  root.className = "chatting-attachments";
  dom.set(root, "data-drag", "none");
  root.hidden = true;
  field.closest(".input").before(root);

  const allowed = () => !busy && !destroyed && !field.disabled && !field.readOnly;

  const update = () => {
    const hidden = !items.length || busy;
    const changed =
      root.hidden !== hidden || dom.get(form, "data-attachments") !== String(items.length);

    root.hidden = hidden;
    dom.set(form, "data-attachments", String(items.length));
    root.inert = !allowed();
    form.dispatchEvent(new Event("chatting-attachments"));
    if (!changed || destroyed) return;

    form.closest(".chatting")?.dispatchEvent(new Event("chatting-viewport"));
  };

  const remove = (item) => {
    const at = items.indexOf(item);

    if (at < 0) return;

    items.splice(at, 1);
    item.node.remove();
    item.destroy?.();
    if (item.url) URL.revokeObjectURL(item.url);

    update();
  };

  const open = async (item, anchor) => {
    if (!allowed() || item.opened || !items.includes(item)) return;

    item.opened = true;

    const state = () => JSON.stringify([item.description, item.spoiler, item.edit]);
    const initial = state();
    const root = dom.create("div");
    const preview = avatar(item.url);
    const group = dom.create("div");
    const check = dom.create("div");
    const label = dom.create("label");
    const name = dom.create("span");
    const checkbox = dom.create("input");
    const discard = dom.create("button");

    root.className = "chatting-attachment-options";
    preview.root.classList.add("chatting-attachment-preview");
    if (item.edit) dom.set(preview.root, "data-edit", "");

    preview.set(item.url, item.edit);
    group.className = "group";
    check.className = "group-item checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = item.spoiler;
    name.textContent = i18n.message("chatting.attach.spoiler");
    dom.set(name, "data-i18n", "chatting.attach.spoiler");
    label.append(name, checkbox);
    check.append(label);

    const action = (key, run) => {
      const row = dom.create("div");
      const button = dom.create("button");
      const text = dom.create("span");
      const arrow = dom.create("span");

      row.className = "group-item";

      button.type = "button";

      arrow.className = "group-next";
      dom.set(arrow, "data-icon", "arrow");

      text.textContent = i18n.message(key);
      dom.set(text, "data-i18n", key);

      dom.set(button, "data-response", "");
      button.append(text, arrow);

      dom.on(button, "click", async () => {
        if (!allowed() || button.disabled) return;

        button.disabled = true;
        try {
          await run(button);
        } finally {
          button.disabled = false;
          root.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });

      row.append(button);

      return row;
    };

    group.append(
      action("chatting.attach.description", async () => {
        const content = dom.create("div");
        const input = dom.create("textarea");

        content.className = "input";
        input.value = item.description;
        input.rows = 3;
        input.maxLength = rules.description;
        dom.set(input, "data-control", "");
        content.append(input);

        const confirmed = await dialog({
          title: "chatting.attach.description",
          content,
          direction: "→",
          actions: [
            { text: "image.cancel", icon: "close", value: false },
            { text: "image.confirm", icon: "check", value: true, data: ["data-confirm"] }
          ]
        });

        if (confirmed && allowed() && items.includes(item)) item.description = input.value;
      }),
      check,
      action("image.title", async (button) => {
        const result = await edit(item.file, {
          anchor: button,
          shape: "original",
          edit: item.edit
        });

        if (!result || !allowed() || !items.includes(item)) return;

        item.edit = result.edit;
        item.receipt = null;
        dom.set(item.preview.root, "data-edit", "");
        dom.set(preview.root, "data-edit", "");
        item.preview.set(item.url, item.edit);
        preview.set(item.url, item.edit);
      })
    );

    dom.on(checkbox, "change", () => {
      if (allowed() && items.includes(item)) item.spoiler = checkbox.checked;

      root.dispatchEvent(new Event("input", { bubbles: true }));
    });

    discard.type = "button";
    dom.set(discard, "data-danger", "");
    dom.set(discard, "data-icon", "trash");

    discard.textContent = i18n.message("chatting.attach.remove");
    dom.set(discard, "data-i18n", "chatting.attach.remove");
    dom.set(discard, "data-response", "");
    dom.set(discard, "data-layer-action", "remove");
    root.append(preview.root, group, discard);
    try {
      const result = await sheet({
        route: ["actions", "attachment"],
        anchor,
        back: true,
        title: "chatting.tools.image",
        content: root,
        stage: "full",
        direction: "→",
        actions: [
          {
            text: "image.confirm",
            icon: "check",
            head: true,
            value: true,
            disabled: () => state() === initial
          }
        ]
      });

      if (result === "remove" && allowed()) remove(item);
    } finally {
      item.opened = false;
    }
  };

  const add = (value) => {
    if (!allowed()) return false;

    if (items.length >= rules.maximum) {
      toast({ text: "chatting.attach.limit", type: "warning" });

      return false;
    }

    const sticker = value?.type === "ogq" ? rules.ogq(value) : rules.giphy(value);
    const file = value instanceof Blob ? value : null;

    if (!sticker && (!file?.size || !rules.types.includes(file.type))) {
      toast({ text: "image.loadError", type: "error" });

      return false;
    }

    if (file && file.size > maximum) {
      toast({ text: "image.sizeError", type: "error" });

      return false;
    }

    const node = dom.create("div");
    const close = dom.create("button");
    const url = file ? URL.createObjectURL(file) : null;
    const preview = file ? avatar(url, "button") : null;
    const image = sticker ? dom.create("img") : preview.root;
    const item = {
      ...(sticker || { type: file.type === "image/gif" ? "gif" : "image" }),
      file,
      url,
      node,
      preview,
      description: "",
      spoiler: false,
      edit: null
    };

    node.className = "chatting-attachment";
    image.classList.add("chatting-attachment-preview");
    if (sticker) {
      if (sticker.provider === "giphy") {
        const media = dom.create("button");

        media.type = "button";
        media.className = "chatting-attachment-preview";
        item.destroy = giphy.image(media, value, { preview: true });
        node.append(media);
      } else {
        image.src = rules.source(sticker);
        image.alt = "OGQ";
        image.draggable = false;
        image.referrerPolicy = "no-referrer";
      }
    } else dom.on(image, "click", () => open(item, image));

    close.type = "button";
    close.className = "chatting-attachment-close";
    dom.set(close, "data-blur", "");
    dom.set(close, "data-shadow", "");
    dom.set(close, "data-icon", "close");
    dom.set(close, "data-circle", "");
    dom.set(close, "data-scale", "");
    dom.set(close, "data-tooltip", "chatting.attach.remove");
    dom.set(close, "data-response", "");
    dom.on(close, "click", () => {
      if (allowed()) remove(item);
    });

    if (sticker?.provider !== "giphy") node.append(image);

    node.append(close);
    root.append(node);
    items.push(item);
    update();

    return true;
  };

  const read = async (source) => {
    try {
      const url = new URL(source);

      if (
        url.username ||
        url.password ||
        !(
          url.protocol === "https:" ||
          (url.protocol === "blob:" && url.origin === location.origin) ||
          /^data:image\/(gif|png|jpeg|webp);base64,/i.test(source)
        )
      )
        throw new Error("Unsupported clipboard image");
      const response = await fetch(url, {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
        signal: AbortSignal.timeout(15_000)
      });
      const type = response.headers.get("content-type")?.split(";")[0];

      if (!response.ok || !rules.types.includes(type) || !response.body)
        throw new Error("Unsupported clipboard image");
      const reader = response.body.getReader();
      const chunks = [];

      let size = 0;

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        size += value.byteLength;
        if (size > maximum || destroyed) {
          await reader.cancel();
          if (!destroyed) toast({ text: "image.sizeError", type: "error" });

          return;
        }

        chunks.push(value);
      }

      add(new Blob(chunks, { type }));
    } catch {
      if (!destroyed) toast({ text: "chatting.attach.clipboard", type: "warning" });
    }
  };

  const paste = (event) => {
    if (
      event.type === "beforeinput" &&
      !["insertFromPaste", "insertFromDrop"].includes(event.inputType)
    )
      return;
    const data = event.clipboardData || event.dataTransfer;

    if (!data) return;
    const candidates = data.files?.length
      ? [...data.files]
      : [...(data.items || [])]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter(Boolean);

    const mime = {
      gif: "image/gif",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp"
    };

    const files = candidates
      .map((file) =>
        file.type
          ? file
          : new Blob([file], { type: mime[file.name?.split(".").at(-1)?.toLowerCase()] })
      )
      .filter((file) => rules.types.includes(file.type));
    const html = data.getData("text/html");
    const template = dom.create("template");

    // 붙여넣은 HTML은 화면에 삽입하지 않고 이미지 주소만 읽습니다.
    if (!files.length && html.length > maximum * 2) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast({ text: "image.sizeError", type: "error" });

      return;
    }

    if (!files.length) template.innerHTML = html;
    const sources = [...template.content.querySelectorAll("img[src]")].map((image) =>
      image.getAttribute("src")
    );

    if (!files.length && !sources.length && !candidates.length) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (!allowed()) return;

    if (files.length) files.forEach(add);
    else if (sources.length) {
      void (async () => {
        for (const source of sources.slice(0, rules.maximum)) {
          if (!allowed()) break;

          if (items.length >= rules.maximum) {
            toast({ text: "chatting.attach.limit", type: "warning" });
            break;
          }

          await read(source);
        }

        if (sources.length > rules.maximum)
          toast({ text: "chatting.attach.limit", type: "warning" });
      })();
    } else toast({ text: "chatting.attach.clipboard", type: "warning" });
    const text = data.getData("text/plain");

    if (files.length && text && !input.insert(field, text))
      toast({ text: "chatting.tooLong", type: "warning" });
  };

  const off = ["paste", "beforeinput", "drop"].map((type) => dom.on(editor, type, paste, true));
  const observer = new MutationObserver(update);

  observer.observe(field, { attributes: true, attributeFilter: ["disabled", "readonly"] });

  update();

  return {
    add,
    snapshot: () => items.map((item) => ({ ...item })),
    receipt: (entry, value) => {
      const item = items.find((item) => item.node === entry.node);

      if (item) item.receipt = value;
    },
    busy: (value) => {
      busy = value;
      update();
    },
    clear: (batch) => {
      for (const entry of batch) {
        const item = items.find((item) => item.node === entry.node);

        if (item) remove(item);
      }
    },
    destroy: () => {
      destroyed = true;
      [...items].forEach(remove);
      observer.disconnect();
      off.forEach((remove) => remove());
      root.remove();
    }
  };
}

export async function prepare(batch, attached, signal, change) {
  const items = [];

  for (const item of batch) {
    if (signal.aborted) return { ok: false, status: 0 };

    if (item.provider === "giphy") {
      items.push(rules.giphy(item));
      continue;
    }

    if (item.type === "ogq") {
      items.push(rules.ogq(item));
      continue;
    }

    const result =
      item.receipt?.expires > Date.now()
        ? { ok: true, data: item.receipt }
        : await upload(`${path}/attachment`, item, {
            cache: "no-store",
            signal,
            ...(change && { progress: (loaded, total) => change(item, (loaded / total) * 100) })
          });

    if (!result.ok || !validId(result.data?.token)) return { ok: false, status: result.status };

    change?.(item, 100);
    item.receipt = result.data;
    attached.receipt(item, result.data);
    items.push({
      type: item.type,
      token: result.data.token,
      description: item.description,
      spoiler: item.spoiler
    });
  }

  return { ok: true, items };
}

export function queue(root, field, attached, dispatch, allowed) {
  let tail = Promise.resolve();

  const waiting = new Set();
  const submit = (file = null, previous = null) => {
    if (field.disabled || field.readOnly) return Promise.resolve(false);
    const batch = previous?.batch || (file ? [] : attached().snapshot());
    const text = previous?.text ?? field.value;
    const recipient = previous ? previous.recipient : dom.get(field.form, "data-whisper");

    if (!allowed({ file, batch, text, recipient })) return Promise.resolve(false);

    if (!file && !text.trim() && !batch.length) return Promise.resolve(false);
    const controller = new AbortController();
    const draft = {
      token: previous?.token || crypto.randomUUID(),
      batch,
      text,
      recipient,
      used: previous?.used || (file ? [] : recent.snapshot(field, text, batch)),
      controller,
      queued: true
    };

    if (previous) waiting.delete(previous);

    previous?.pending?.remove();
    field.form.dispatchEvent(new Event("chatting-emotes-close"));
    draft.pending = file ? null : pending(root, batch, text, () => controller.abort(), recipient);
    if (!file && !previous) {
      field.value = "";
      field.dispatchEvent(new Event("input", { bubbles: true }));
      attached().clear(batch);
    }

    field.form.dispatchEvent(new Event("chatting-state"));
    waiting.add(draft);

    let succeeded = false;

    const result = tail
      .then(async () => {
        if (controller.signal.aborted) return false;
        const sent = await dispatch(file, draft).catch(() => false);

        succeeded = sent;
        if (!sent && !controller.signal.aborted && draft.pending) {
          draft.pending.fail(() => submit(file, draft));
        }
        return sent;
      })
      .finally(() => {
        if (succeeded || controller.signal.aborted || !draft.pending) waiting.delete(draft);

        if (controller.signal.aborted) draft.pending?.remove();
      });

    tail = result.catch(() => false);
    return tail;
  };

  submit.cancel = () => {
    for (const draft of waiting) {
      draft.controller.abort();
      draft.pending?.remove();
    }
    waiting.clear();
  };

  return submit;
}

export function pending(root, batch, text, cancel, recipient = "") {
  const user = profile.value("me");
  const message = chat.append(root, {
    id: user?.id,
    name: user?.name,
    avatar: user?.avatar,
    verified: user?.verified,
    own: true,
    private:
      Boolean(recipient) ||
      dom.get(root.closest(".chatting") || root, "data-chatting") === "messenger",
    peer: recipient || undefined,
    pending: true,
    text: text || " ",
    time: new Date().toISOString(),
    attachments: batch
      .filter((item) => !item.file)
      .map((item) => (item.provider === "giphy" ? rules.giphy(item) : rules.ogq(item)))
  });

  if (!message) return null;

  dom.set(message, "data-pending", "");

  const time = dom.query(".chatting-time", message);

  if (batch.some((item) => item.file)) {
    time.textContent = i18n.message("chatting.sending");
    time.removeAttribute("datetime");
    time.removeAttribute("title");
  }

  const content = dom.query(".chatting-text", message);
  const group = dom.query(".chatting-image-group", content) || dom.create("div");

  group.className = "chatting-image-group";
  for (const media of dom.all(":scope > .chatting-image", content)) group.append(media);
  if (batch.length) content.append(group);

  dom.on(message, "contextmenu", (event) => {
    if (message.hasAttribute("data-pending")) event.preventDefault();
  });

  const media = [...group.children];
  const controls = new Map();
  const urls = [];

  let stopped = false;
  let saved = false;
  let retry;

  const list = message.closest(".chatting-list");
  const remove = () => {
    stopped = true;
    if (!saved) message.remove();

    chat.regroup(list);
    if (saved) {
      Promise.all(
        [...message.querySelectorAll("img")].map((image) => image.decode().catch(() => {}))
      ).then(() => urls.forEach((url) => URL.revokeObjectURL(url)));
    } else urls.forEach((url) => URL.revokeObjectURL(url));
    for (const { ring } of controls.values()) ring?.destroy();
  };

  for (const item of batch) {
    if (!item.file) {
      group.append(media.shift());
      continue;
    }
    const url = URL.createObjectURL(item.file);
    const frame = dom.create("span");
    const image = avatar(url);
    const button = dom.create("button");
    const ring = progress({ type: "circular", value: item.receipt ? 100 : 0, show: false });

    urls.push(url);
    frame.className = "chatting-image";
    image.root.className = "chatting-attachment-preview";
    dom.remove(image.root, "data-icon");
    image.set(url, item.edit);
    button.type = "button";
    button.className = "chatting-attachment-close chatting-upload";
    for (const name of ["data-circle", "data-blur", "data-shadow", "data-response"])
      dom.set(button, name, "");
    button.append(ring.element);
    dom.on(button, "click", () => {
      if (retry) {
        void retry();
        return;
      }

      if (stopped) return;

      cancel();
      remove();
    });

    controls.set(item, { button, ring });
    frame.append(image.root, button);
    group.append(frame);
  }
  const end = dom.query(".chatting-page ~ .chatting-page", list);

  if (end) list.insertBefore(message, end);

  chat.regroup(list);
  list.scrollTop = list.scrollHeight;

  return {
    accept: (options) => {
      saved = true;

      let index = 0;

      const previews = batch.map((item) => (item.file ? urls[index++] : ""));

      chat.append(list, { ...options, previews }, false, message);
      dom.remove(message, "data-pending");
      dom.remove(message, "data-failed");
      return message;
    },
    change: (item, value) => controls.get(item)?.ring.set(value),
    fail: (resume) => {
      retry = resume;
      dom.set(message, "data-failed", "");
      time.textContent = i18n.message("chatting.failed");
      if (!controls.size) {
        const button = dom.create("button");

        button.type = "button";
        dom.set(button, "data-circle", "");
        dom.set(button, "data-response", "");
        dom.on(button, "click", () => retry?.());
        content.append(button);
        controls.set(null, { button });
      }
      for (const { button, ring } of controls.values()) {
        ring?.destroy();
        button.disabled = false;
        dom.set(button, "data-failed", "");
        dom.set(button, "data-icon", "reload");
      }
    },
    commit: () => {
      stopped = true;
      for (const { button } of controls.values()) button.disabled = true;
    },
    complete: (node) => {
      const images = node ? dom.all(".chatting-image", node) : [];

      for (const [item, { ring }] of controls) {
        ring?.destroy();
        if (!item) continue;

        const mark = dom.create("span");

        mark.className = "chatting-upload";
        for (const name of ["data-circle", "data-blur", "data-shadow"]) dom.set(mark, name, "");
        dom.set(mark, "data-icon", "check");
        images[batch.indexOf(item)]?.append(mark);
        setTimeout(() => mark.remove(), 700);
      }
      remove();
    },
    remove
  };
}
