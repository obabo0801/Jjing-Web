import * as dom from "./dom.js";
import * as i18n from "./i18n.js";
import "../../css/common/file.css";

i18n.preload("file.select", "file.empty", "file.clear");

export default function file({ accept = "", multiple = false } = {}) {
  const root = dom.create("div");
  const input = dom.create("input");
  const choose = dom.create("button");
  const clear = dom.create("button");
  const name = dom.create("span");
  const preview = dom.create("div");
  const image = dom.create("img");

  let url;

  preview.className = "file-preview";
  image.alt = "";
  clear.className = "file-close";
  dom.set(clear, "data-circle", "");
  dom.set(clear, "data-background", "");

  root.className = "file";
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  input.hidden = true;
  name.className = "file-name";
  for (const [button, icon, key] of [
    [choose, "plus", "file.select"],
    [clear, "close", "file.clear"]
  ]) {
    button.type = "button";
    dom.set(button, "data-icon", icon);
    dom.set(button, "data-color", "");
    dom.set(button, "data-response", "");
    dom.set(button, "data-tooltip", key);

    if (button === clear) {
      button.title = i18n.message(key);
      continue;
    }

    const text = dom.create("span");

    text.textContent = i18n.message(key);
    dom.set(text, "data-i18n", key);
    button.append(text);
  }

  const update = () => {
    const files = [...input.files];

    if (url) URL.revokeObjectURL(url);

    url = undefined;
    image.removeAttribute("src");

    const selected = files.find((item) => item.type.startsWith("image/"));

    image.hidden = !selected;
    if (selected) {
      url = URL.createObjectURL(selected);
      image.src = url;
    }

    name.textContent = files.length
      ? files.map((item) => item.name).join("\n")
      : i18n.message("file.empty");

    if (files.length) dom.remove(name, "data-i18n");
    else dom.set(name, "data-i18n", "file.empty");

    preview.hidden = !files.length;
    name.hidden = Boolean(selected);
    root.toggleAttribute("data-selected", Boolean(files.length));
  };

  const reset = () => {
    input.value = "";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  dom.on(choose, "click", () => input.click());
  dom.on(clear, "click", reset);
  dom.on(input, "change", update);
  preview.append(image, clear);
  root.append(input, choose, name, preview);
  update();

  const destroy = () => {
    if (url) URL.revokeObjectURL(url);

    url = undefined;
  };

  return { root, input, reset, destroy };
}
