import * as dom from "#common/dom";
import * as link from "#common/link";
import * as manage from "#common/chatting/manage";
import * as quality from "#common/image/quality";
import load from "#common/image/load";
import context from "#common/context";
import sheet from "#common/sheet";
import "../../../css/common/chatting/asset.css";

const entries = new WeakMap();
const opened = new WeakSet();

const node = (tag, name, text = "") => {
  const element = dom.create(tag);

  element.className = name;
  element.textContent = text;

  return element;
};

export const find = (target) => {
  for (let element = target; element instanceof Element; element = element.parentElement) {
    if (entries.has(element)) return element;
  }

  return null;
};

export async function open(target) {
  if (!target || opened.has(target) || target.hasAttribute("data-spoiler")) return;

  if (target.closest(".chatting-message[data-pending]")) return;

  const stored = entries.get(target);
  const value = typeof stored === "function" ? stored() : stored;

  if (!value?.url) return;

  opened.add(target);

  const picture = value.kind === "image";
  const message = target.closest(".chatting-message") || value.message;
  const options = manage.read(message, value.record || {});

  if (message?.hasAttribute("data-deleted") && !manage.allowed(message, options)) {
    opened.delete(target);
    return;
  }

  let loading;

  try {
    let selected;

    if (picture) {
      selected = node("span", "chatting-image");

      const image = node("img", "");

      image.hidden = true;
      image.alt = value.name || "";
      image.draggable = false;
      image.referrerPolicy = "no-referrer";
      selected.append(image);
      loading = load(image, { target: selected, source: quality.thumb(value), progress: false });
    } else {
      selected = node("span", "asset");

      const icon = node("span", "asset-icon");
      const body = node("span", "asset-body");

      dom.set(icon, "data-icon", value.kind === "file" ? "download" : "link");
      if (value.name) body.append(node("span", "asset-title", value.name));

      body.append(node("span", "asset-address", value.url));
      selected.append(icon, body);
    }

    let menu;

    const result = await sheet({
      route: [
        "target",
        `${location.pathname}?${new URLSearchParams({ ...(options.url || options.token ? { message: options.url || options.token } : {}), [value.kind]: value.url })}`
      ],
      direction: "↓",
      content: async () => {
        menu = await manage.menu(message, options, { ...value, content: selected }, target);
        return { content: menu.root, dispose: menu.off };
      }
    });

    await menu?.run(result);

    if (result !== "open") return result;

    if (typeof value.open === "function") return value.open();

    if (picture) return false;

    return link.open(value.url, { file: value.kind === "file", confirm: true, name: value.name });
  } finally {
    loading?.destroy();
    opened.delete(target);
  }
}

export const bind = (element, value, listen = true) => {
  const attached = entries.has(element);

  entries.set(element, value);
  if (listen && !attached) {
    const ignore = element.matches(".image-view")
      ? "button, .image-view-preview, audio, video"
      : "audio, video";

    context(
      element,
      () => {
        void open(element).catch(console.error);
      },
      ignore
    );
  }

  return element;
};
