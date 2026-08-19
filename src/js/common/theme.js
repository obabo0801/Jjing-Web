import root from "#common/root";
import { query } from "#common/query";
import { on } from "#common/event";
import { get, set } from "#common/storage";

const key = "theme";
const modes = ["system", "light", "dark"];

const scheme = matchMedia("(prefers-color-scheme: dark)");

const meta = query('meta[name="theme-color"]');

let current = "system";
let loaded = false;

const sync = () => {
  root.setAttribute("data-theme", current);

  const dark = current === "dark" || (current === "system" && scheme.matches);

  meta?.setAttribute("content", dark ? "#111111" : "#ffffff");
};

export default function theme(mode) {
  const initial = mode === undefined;

  mode ||= get(key, "system");

  if (!modes.includes(mode)) {
    mode = "system";
  }

  current = mode;

  set(key, mode);

  if (!loaded) {
    on(scheme, "change", sync);

    loaded = true;
  }

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const transition = document.startViewTransition?.bind(document);

  if (initial || reduced || !transition) {
    sync();

    return mode;
  }

  root.setAttribute("data-changing", "");

  transition(sync).finished.finally(() => {
    root.removeAttribute("data-changing");
  });

  return mode;
}
