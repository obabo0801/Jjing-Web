import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import dialog from "#common/dialog";
import toast from "#common/toast";

i18n.preload("profile.copy", "profile.copied", "profile.copyError");

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
  const text = dom.create(short ? "button" : "span");

  row.className = "group-item";
  element.className = "label";
  name.className = "label-key";
  result.className = "label-content";
  text.className = "label-value";
  name.textContent = i18n.message(key);
  text.textContent = date
    ? full.replace(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}).*$/, "$1 $2")
    : full;
  result.append(text);
  if (short) {
    text.type = "button";
    text.textContent = compact ? `${full.slice(0, 8)}…${full.slice(-4)}` : full;

    dom.set(text, "data-response", "");
    dom.on(text, "click", async () => {
      const content = dom.create("p");

      content.className = "profile-id";
      content.textContent = full;
      await dialog({
        title: key,
        content,
        direction: "→",
        actions: [
          { text: "profile.confirm", icon: "check", data: ["data-confirm"] }
        ]
      });
    });

    const copy = dom.create("button");

    copy.type = "button";
    copy.className = "label-copy";
    dom.set(copy, "data-icon", "copy");
    dom.set(copy, "data-response", "");
    dom.set(copy, "data-tooltip", "profile.copy");
    dom.on(copy, "click", async () => {
      if (copy.disabled) return;
      copy.disabled = true;
      try {
        await navigator.clipboard.writeText(full);
        toast({ type: "success", title: "profile.copied" });
      } catch {
        toast({ type: "error", title: "profile.copyError" });
      } finally {
        copy.disabled = false;
      }
    });
    result.append(copy);
  }
  dom.set(name, "data-i18n", key);
  element.append(name, result);
  row.append(element);
  return row;
}
