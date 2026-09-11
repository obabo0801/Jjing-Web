import * as dom from "#common/dom";
import * as i18n from "#common/i18n";

export const badge = (button, count) => {
  let node = dom.query(".toolbar-badge", button);

  const show = Number.isSafeInteger(count) && count >= 0;

  if (!node && !show) return;
  if (!node) {
    node = dom.create("span");
    node.className = "toolbar-badge";
    button.append(node);
  }
  node.hidden = !show;
  node.textContent = show ? (count > 99 ? "99+" : String(count)) : "";
};

export default function toolbar(items = []) {
  const root = dom.create("div");

  root.className = "toolbar";

  for (const { icon, text, run, disabled = false } of items) {
    const button = dom.create("button");
    const label = dom.create("span");

    button.type = "button";
    button.disabled = disabled;
    label.textContent = i18n.message(text);
    i18n.preload(text);
    dom.set(button, "data-icon", icon);
    dom.set(button, "data-response", "");
    dom.set(label, "data-i18n", text);
    button.append(label);

    let running = false;

    dom.on(button, "click", async () => {
      if (running || button.disabled) return;
      running = true;

      try {
        await run?.(button);
      } catch (error) {
        console.error(error);
      } finally {
        running = false;
      }
    });
    root.append(button);
  }

  return root;
}
