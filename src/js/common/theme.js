import * as dom from "#common/dom";
import { get, set } from "#common/storage";

const key = "theme";
const modes = ["system", "light", "dark"];

const scheme = matchMedia("(prefers-color-scheme: dark)");

const meta = dom.query('meta[name="theme-color"]');

let selected = "system";
let loaded = false;

const sync = () => {
  dom.set(dom.root, "data-theme", selected);

  const dark =
    selected === "dark" ||
    (selected === "system" && scheme.matches);

  dom.set(meta, "content", dark ? "#181818" : "#ffffff");
};

export default function theme(mode) {
  const initial = mode === undefined;

  mode ||= get(key, "system");

  if (!modes.includes(mode)) {
    mode = "system";
  }

  selected = mode;

  set(key, mode);

  if (!loaded) {
    dom.on(scheme, "change", sync);

    loaded = true;
  }

  const reduced = matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const transition =
    document.startViewTransition?.bind(document);

  if (initial || reduced || !transition) {
    sync();

    return mode;
  }

  dom.set(dom.root, "data-changing", "");

  transition(sync).finished.finally(() => {
    dom.remove(dom.root, "data-changing");
  });

  return mode;
}
