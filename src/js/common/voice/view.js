import * as dom from "#common/dom";
import { message } from "#common/i18n";
import sound from "#common/sound";
import { meter } from "#common/voice/audio";

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

export const visualize = (target, stream) => {
  sound.play("send");

  const stopDisplay = display(target);
  const element = surface(target);

  if (!element) {
    return stopDisplay;
  }

  const visual = dom.query(".input", element) || element;

  const ping = visual.animate(
    [{ outlineOffset: "-2px" }, { outlineOffset: "6px" }],
    { duration: 1000, fill: "both" }
  );

  ping.pause();

  let value = 0;

  const stopMeter = stream
    ? meter(stream, (level) => {
        const next = Math.min(
          Math.max((level - 0.02) * 125, 0),
          1000
        );

        value += (next - value) * 0.15;

        ping.currentTime = value;
      })
    : () => {};

  let stopped = false;

  return () => {
    if (stopped) {
      return;
    }

    stopped = true;

    stopMeter();

    const offset = getComputedStyle(visual).outlineOffset;

    ping.cancel();

    visual.animate(
      [
        {
          outlineColor: "var(--active)",
          outlineOffset: offset
        },
        {
          outlineColor: "transparent",
          outlineOffset: "-6px"
        }
      ],
      { duration: 220, easing: "ease-in" }
    );

    stopDisplay();
  };
};
