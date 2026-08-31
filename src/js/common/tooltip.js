import * as dom from "#common/dom";
import { message, register } from "#common/i18n";

const selector = "[data-tooltip], [title]";
let tip;
let source;

register("data-tooltip", () => {});

const convert = (element) => {
  const title = dom.get(element, "title");

  if (title === null) {
    return element;
  }

  if (
    dom.get(element, "data-tooltip") === null &&
    title.trim()
  ) {
    dom.set(element, "data-tooltip", title.trim());
  }

  dom.remove(element, "title");

  return element;
};
const content = (element) => {
  const key = dom.get(element, "data-tooltip")?.trim();

  return key ? message(key) || key : "";
};
const hide = (element = source) => {
  if (element !== source) {
    return;
  }

  source = null;
  dom.remove(tip, "data-open");
};
const place = () => {
  if (!source?.isConnected || !tip) {
    hide();

    return;
  }

  const target = source.getBoundingClientRect();
  const box = tip.getBoundingClientRect();
  const gap = 8;
  const edge = 8;
  const below = target.top < box.height + gap + edge;
  const center = target.left + target.width / 2;
  const left = Math.min(
    innerWidth - box.width - edge,
    Math.max(edge, center - box.width / 2)
  );
  const top = below
    ? target.bottom + gap
    : target.top - box.height - gap;
  const arrow = Math.min(
    box.width - 12,
    Math.max(12, center - left)
  );

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  tip.style.setProperty("--tooltip-arrow", `${arrow}px`);
  dom.set(tip, "data-side", below ? "bottom" : "top");
};
const show = (element) => {
  element = convert(element);

  const value = content(element);

  if (!value) {
    hide();

    return;
  }

  source = element;
  tip.textContent = value;
  place();
  dom.set(tip, "data-open", "");
};
const target = (event) => event.target.closest?.(selector);
const enter = (event) => {
  const element = target(event);

  if (!element || element.contains(event.relatedTarget)) {
    return;
  }

  show(element);
};
const leave = (event) => {
  const element = target(event);

  if (!element || element.contains(event.relatedTarget)) {
    return;
  }

  hide(element);
};

export default function tooltip() {
  dom.all("[title]").forEach(convert);

  const wrap = dom.create("div");

  tip = dom.create("div");
  tip.className = "tooltip";
  dom.set(tip, "data-background", "");
  dom.set(tip, "data-shadow", "");
  wrap.append(tip);
  dom.body.append(wrap);

  dom.on(document, "pointerover", enter);
  dom.on(document, "pointerout", leave);
  dom.on(document, "focusin", enter);
  dom.on(document, "focusout", leave);
  dom.on(document, "scroll", place, true);
  dom.on(window, "resize", place);
}
