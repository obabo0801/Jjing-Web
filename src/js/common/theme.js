import * as dom from "#common/dom";
import { get, set } from "#common/storage";

const modes = ["system", "light", "dark"];
const scheme = matchMedia("(prefers-color-scheme: dark)");
const meta = dom.query('meta[name="theme-color"]');
let selected = "system";
let listening = false;
const sync = () => {
  dom.set(dom.root, "data-theme", selected);

  const dark =
    selected === "system"
      ? scheme.matches
      : selected === "dark";
  const color = dark ? "#181818" : "#ffffff";

  dom.set(meta, "content", color);
};

export default function theme(mode) {
  const wearable = dom.has("wearable");

  mode ||= get("theme", wearable ? "dark" : "system");

  if (!modes.includes(mode)) {
    mode = "system";
  }

  selected = mode;
  set("theme", mode);

  if (!listening) {
    dom.on(scheme, "change", sync);
    listening = true;
  }

  sync();

  return mode;
}
