import * as dom from "#common/dom";
import { get, set } from "#common/storage";

export const modes = ["system", "light", "dark", "black"];
const scheme = matchMedia("(prefers-color-scheme: dark)");
const colors = new Map();

let listening = false;
let background;
let selected;

const sync = () => {
  let meta = dom.query('meta[name="theme-color"]');

  if (!meta) {
    meta = dom.create("meta");
    dom.set(meta, "name", "theme-color");
    document.head.append(meta);
  }

  if (!background) {
    background = dom.create("span");
    background.className = "theme-color";
    background.hidden = true;
    dom.body.append(background);
  }

  const source = [...colors.values()].at(-1) || dom.root;
  const target =
    source === dom.root || (source instanceof Element && !source.isConnected)
      ? background
      : source;

  const color =
    target instanceof Element
      ? getComputedStyle(target).backgroundColor
      : target;

  dom.set(meta, "content", color);
};

const apply = () => {
  const value =
    selected === "system" ? (scheme.matches ? "dark" : "light") : selected;

  if (dom.get(dom.root, "data-theme") !== value) {
    dom.set(dom.root, "data-theme", value);
  }

  sync();
};

export const color = (value) => {
  const key = {};

  colors.set(key, value);
  sync();

  return () => {
    colors.delete(key);
    sync();
  };
};

export default function theme(mode) {
  const fallback = dom.has("wearable") ? "black" : "system";

  mode ||= get("theme", fallback);

  if (!modes.includes(mode)) {
    mode = fallback;
  }

  selected = mode;
  set("theme", selected);

  if (!listening) {
    dom.on(scheme, "change", apply);
    dom.on(window, "pageshow", apply);
    dom.on(document, "visibilitychange", () => {
      if (!document.hidden) {
        apply();
      }
    });
    const observer = new MutationObserver(sync);

    observer.observe(dom.root, {
      attributes: true,
      attributeFilter: ["data-theme", "class"]
    });
    listening = true;
  }

  apply();

  return mode;
}
