import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import progress from "#common/progress";
import sound from "#common/sound";
import swipe from "#common/swipe";
import vibrate from "#common/vibrate";

const icons = Object.freeze({
  error: "error",
  warning: "warning",
  success: "check",
  info: "info",
  notify: "notify"
});

const signals = Object.freeze({
  error: ["failure", "error"],
  warning: ["alert", "alert"],
  success: ["success", "success"],
  info: ["pop", "response"],
  notify: ["bell", "receive"]
});

const reduce = matchMedia(
  "(prefers-reduced-motion: reduce)"
);

let stack;

export const raise = () => {
  if (!stack?.isConnected) {
    return;
  }

  if (stack.matches(":popover-open")) {
    stack.hidePopover();
  }

  stack.showPopover();
};

const host = () => {
  if (!stack?.isConnected) {
    stack = dom.create("div");
    stack.className = "toasts";

    dom.set(stack, "popover", "manual");
    dom.body.append(stack);
  }

  raise();

  return stack;
};

const createText = (tag, name, value) => {
  if (!value) {
    return null;
  }

  const element = dom.create(tag);

  element.className = name;
  element.textContent = i18n.message(value) || value;
  dom.set(element, "data-i18n", value);

  return element;
};

const loadImage = (target, options) => {
  if (!options.image) {
    return Promise.resolve();
  }

  const media = dom.create("div");
  const image = dom.create("img");
  const loading = progress({
    type: "circular",
    value: 25,
    show: false,
    target: media
  });

  media.className = "toast-media";
  image.className = "toast-image";
  image.alt = options.alt ?? "";
  image.draggable = false;
  image.hidden = true;
  media.append(image);
  target.append(media);

  return new Promise((resolve) => {
    let done = false;

    const finish = async (loaded) => {
      if (done) {
        return;
      }

      done = true;
      loading.destroy();

      if (loaded) {
        image.hidden = false;
      } else {
        dom.set(media, "data-close", "");

        if (!reduce.matches) {
          await wait(media);
        }

        media.remove();
      }

      resolve();
    };

    dom.on(image, "load", () => finish(true), {
      once: true
    });

    dom.on(image, "error", () => finish(false), {
      once: true
    });

    image.src = options.image;

    if (image.complete) {
      queueMicrotask(() => finish(image.naturalWidth > 0));
    }
  });
};

const wait = (element) => {
  const animations = element
    .getAnimations()
    .map((animation) => animation.finished);

  return Promise.allSettled(animations);
};

export default function toast(options = {}) {
  if (typeof options === "string") {
    options = { text: options };
  }

  const requested = String(
    options.type ?? "custom"
  ).toLowerCase();

  const type = Object.hasOwn(icons, requested)
    ? requested
    : "custom";
  const element = dom.create("section");

  element.className = "toast";
  dom.set(element, "data-toast", type);

  if (type === "custom") {
    dom.set(element, "data-background", "");

    if (options.background) {
      element.style.setProperty(
        "--toast-color",
        options.background
      );
    }

    if (options.color) {
      element.style.setProperty(
        "--toast-text",
        options.color
      );
    }
  }

  const mark = dom.create("span");

  mark.className = "toast-mark";
  dom.set(mark, "data-background", "");
  dom.set(
    mark,
    "data-icon",
    options.icon ?? icons[type] ?? "info"
  );

  const content = dom.create("div");

  content.className = "toast-content";

  const title = createText(
    "h3",
    "toast-title",
    options.title
  );
  const text = createText("p", "toast-text", options.text);

  if (title) {
    content.append(title);
  }

  if (text) {
    content.append(text);
  }

  const imageReady = loadImage(content, options);
  const button = dom.create("button");

  button.type = "button";
  button.className = "toast-close";
  dom.set(button, "data-response", "");
  dom.set(button, "data-opacity", "");
  dom.set(button, "data-icon", "close");

  element.append(mark, content, button);

  const gauge = progress({
    value: 0,
    show: false,
    target: element
  });
  const url = String(options.url ?? "").trim();
  const duration = Math.max(
    1000,
    Number(options.duration) || 5000
  );

  const [defaultSound, defaultVibration] =
    signals[type] ?? [];
  const effect = options.sound ?? defaultSound;
  const vibration = options.vibration ?? defaultVibration;

  if (url) {
    dom.set(element, "data-url", "");

    dom.on(element, "click", (event) => {
      if (event.target.closest(".toast-close")) {
        return;
      }

      location.assign(url);
    });
  }

  host().append(element);
  i18n.translate().catch(() => false);

  if (effect) {
    sound.play(effect);
  }

  if (vibration) {
    vibrate.play(vibration);
  }

  let frame;
  let off = () => {};
  let closing = false;

  const close = async () => {
    if (closing) {
      return;
    }

    closing = true;
    off();
    cancelAnimationFrame(frame);
    dom.remove(element, "data-open");

    if (!reduce.matches) {
      await wait(element);
    }

    element.remove();

    if (stack && !stack.children.length) {
      if (stack.matches(":popover-open")) {
        stack.hidePopover();
      }

      stack.remove();
      stack = undefined;
    }
  };

  dom.on(button, "click", close);

  off = swipe("←", {
    target: element,

    end: (complete) => {
      if (complete) {
        close();
      }
    }
  });

  frame = requestAnimationFrame(() => {
    if (closing) {
      return;
    }

    dom.set(element, "data-open", "");

    imageReady.then(() => {
      if (closing) {
        return;
      }

      frame = requestAnimationFrame((start) => {
        const update = (time) => {
          const elapsed = time - start;
          const value = Math.min(
            100,
            (elapsed / duration) * 100
          );

          gauge.set(value);

          if (value >= 100) {
            close();
            return;
          }

          frame = requestAnimationFrame(update);
        };

        frame = requestAnimationFrame(update);
      });
    });
  });

  return { element, close };
}
