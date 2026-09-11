import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as input from "#common/input";
import * as rules from "#shared/attachment";
import maximum from "#shared/upload";
import avatar from "#common/avatar";
import edit from "#common/image";
import sheet from "#common/sheet";
import dialog from "#common/dialog";
import toast from "#common/toast";

i18n.preload(
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

  const allowed = () =>
    !busy && !destroyed && !field.disabled && !field.readOnly;

  const update = () => {
    root.hidden = !items.length;
    dom.set(form, "data-attachments", String(items.length));
    root.inert = !allowed();
    form.dispatchEvent(new Event("chatting-attachments"));
  };

  const remove = (item) => {
    const at = items.indexOf(item);

    if (at < 0) return;
    items.splice(at, 1);
    item.node.remove();
    if (item.url) URL.revokeObjectURL(item.url);
    update();
  };

  const open = async (item, anchor) => {
    if (!allowed() || item.opened || !items.includes(item)) return;
    item.opened = true;
    const root = dom.create("div");
    const preview = avatar(item.url);
    const group = dom.create("div");
    const check = dom.create("div");
    const label = dom.create("label");
    const name = dom.create("span");
    const checkbox = dom.create("input");
    const removeButton = dom.create("button");

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
      text.textContent = i18n.message(key);
      dom.set(text, "data-i18n", key);
      dom.set(button, "data-response", "");
      dom.set(arrow, "data-icon", "arrow");
      arrow.className = "profile-next";
      button.append(text, arrow);
      dom.on(button, "click", async () => {
        if (!allowed() || button.disabled) return;
        button.disabled = true;
        try {
          await run(button);
        } finally {
          button.disabled = false;
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
          actions: [
            { text: "image.cancel", icon: "close", value: false },
            {
              text: "image.confirm",
              icon: "check",
              value: true,
              data: ["data-confirm"]
            }
          ]
        });

        if (confirmed && allowed() && items.includes(item))
          item.description = input.value;
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
    });
    removeButton.type = "button";
    removeButton.textContent = i18n.message("chatting.attach.remove");
    dom.set(removeButton, "data-i18n", "chatting.attach.remove");
    dom.set(removeButton, "data-icon", "trash");
    dom.set(removeButton, "data-danger", "");
    dom.set(removeButton, "data-response", "");
    dom.set(removeButton, "data-layer-action", "remove");
    root.append(preview.root, group, removeButton);
    try {
      const result = await sheet({
        anchor,
        title: "chatting.tools.image",
        content: root,
        stage: "full",
        direction: "→"
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
    const sticker = value?.type === "ogq" ? rules.ogq(value) : null;
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
      image.src = rules.source(sticker);
      image.alt = "OGQ";
      image.draggable = false;
      image.referrerPolicy = "no-referrer";
    } else dom.on(image, "click", () => open(item, image));
    close.type = "button";
    close.className = "chatting-attachment-close";
    dom.set(close, "data-icon", "close");
    dom.set(close, "data-circle", "");
    dom.set(close, "data-shadow", "");
    dom.set(close, "data-response", "");
    dom.set(close, "data-tooltip", "chatting.attach.remove");
    dom.on(close, "click", () => {
      if (allowed()) remove(item);
    });
    node.append(image, close);
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
      if (!destroyed)
        toast({ text: "chatting.attach.clipboard", type: "warning" });
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
          : new Blob([file], {
              type: mime[file.name?.split(".").at(-1)?.toLowerCase()]
            })
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
    const sources = [...template.content.querySelectorAll("img[src]")].map(
      (image) => image.getAttribute("src")
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

  const off = ["paste", "beforeinput", "drop"].map((type) =>
    dom.on(editor, type, paste, true)
  );
  const observer = new MutationObserver(update);

  observer.observe(field, {
    attributes: true,
    attributeFilter: ["disabled", "readonly"]
  });
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
