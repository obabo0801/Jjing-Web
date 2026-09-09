import * as dom from "#common/dom";
import * as i18n from "#common/i18n";

export default function label(
  key,
  value,
  { short = false, date = false } = {}
) {
  if (value === undefined || value === null || value === "") return null;
  const full = String(value);
  const compact = short && full.length > 13;
  const row = dom.create("div");
  const element = dom.create("div");
  const name = dom.create("span");
  const result = dom.create("div");
  const text = dom.create(compact ? "button" : "span");

  row.className = "group-item";
  element.className = "label";
  name.className = "label-key";
  result.className = "label-content";
  text.className = "label-value";
  name.textContent = i18n.message(key);
  text.textContent = date
    ? full.replace(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}).*$/, "$1 $2")
    : full;
  if (compact) {
    const brief = `${full.slice(0, 8)}…${full.slice(-4)}`;

    const expand = () => {
      text.replaceChildren(
        full.slice(0, 19),
        dom.create("wbr"),
        full.slice(19)
      );
    };

    text.type = "button";
    text.textContent = brief;

    dom.set(text, "data-response", "");
    dom.set(text, "data-expand", "false");

    dom.on(text, "click", () => {
      const expanded = dom.get(text, "data-expand") !== "true";

      dom.set(text, "data-expand", String(expanded));

      if (expanded) {
        expand();
      } else {
        text.textContent = brief;
      }
    });
  }
  dom.set(name, "data-i18n", key);
  result.append(text);
  element.append(name, result);
  row.append(element);
  return row;
}
