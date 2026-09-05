import * as dom from "#common/dom";
import { get, set } from "#common/storage";

const modes = ["system", "light", "dark"];
const scheme = matchMedia("(prefers-color-scheme: dark)");
const colors = new Map();

let listening = false;

const sync = () => {
  let meta = dom.query('meta[name="theme-color"]');

  if (!meta) {
    meta = dom.create("meta");
    dom.set(meta, "name", "theme-color");
    document.head.append(meta);
  }

  const source = [...colors.values()].at(-1) || dom.root;
  const color =
    source instanceof Element
      ? getComputedStyle(
          source.isConnected ? source : dom.root
        ).backgroundColor
      : source;

  dom.set(meta, "content", color);
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
  const wearable = dom.has("wearable");

  mode ||= get("theme", wearable ? "dark" : "system");

  if (!modes.includes(mode)) {
    mode = "system";
  }

  set("theme", mode);
  dom.set(dom.root, "data-theme", mode);

  if (!listening) {
    dom.on(scheme, "change", sync);
    dom.on(window, "pageshow", sync);
    dom.on(document, "visibilitychange", () => {
      if (!document.hidden) {
        sync();
      }
    });
    for (const type of [
      "transitionend",
      "transitioncancel"
    ]) {
      dom.on(
        document,
        type,
        (event) => {
          if (
            event.propertyName === "background-color" &&
            (event.target === dom.root ||
              [...colors.values()].includes(event.target))
          ) {
            sync();
          }
        },
        true
      );
    }
    const observer = new MutationObserver(sync);

    observer.observe(dom.root, {
      attributes: true,
      attributeFilter: ["data-theme", "class"]
    });
    listening = true;
  }

  sync();

  return mode;
}
