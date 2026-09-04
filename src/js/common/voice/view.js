import * as dom from "#common/dom";
import { message } from "#common/i18n";

const views = new WeakMap();
const isControl = (target) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement;

const surface = (target) => {
  if (!(target instanceof Element)) {
    return null;
  }

  return isControl(target)
    ? target.closest(".search") ||
        target.closest(".input") ||
        target
    : target;
};

export const status = (target, name) => {
  if (isControl(target)) {
    target.placeholder = message(name);
  }
};

const display = (target) => {
  const element = surface(target);

  if (!element) {
    return () => {};
  }

  const control = isControl(target);
  const action = dom.query(".voice", element);
  const view = {};
  const original = control
    ? {
        value: target.value,
        placeholder: target.placeholder,
        readOnly: target.readOnly
      }
    : null;

  views.set(element, view);
  dom.set(element, "data-voice", "");
  dom.set(action, "data-icon", "wave");

  if (control) {
    target.value = "";
    status(target, "voice.listening");
    target.readOnly = true;
  }

  return () => {
    if (views.get(element) !== view) {
      return;
    }

    views.delete(element);
    dom.set(action, "data-icon", "voice");
    dom.remove(element, "data-voice");

    if (control) {
      target.value = original.value;
      target.placeholder = original.placeholder;
      target.readOnly = original.readOnly;
      target.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }
  };
};

export const visualize = (target) => display(target);
