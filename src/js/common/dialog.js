import * as dom from "#common/dom";
import * as back from "#common/back";
import translate from "#common/i18n";
import load, { light } from "#common/loading";
import mount from "#common/mount";
import swipe, { resolve as getDirection } from "#common/swipe";
import vibrate from "#common/vibrate";
import viewport from "#common/viewport";

const reduce = matchMedia("(prefers-reduced-motion: reduce)");

const motions = {
  "→": ["x", "translateX(100vw)"],
  "↘": ["xy", "translate(100vw, 100dvh)"],
  "↓": ["y", "translateY(100dvh)"],
  "↙": ["xy", "translate(-100vw, 100dvh)"],
  "←": ["x", "translateX(-100vw)"],
  "↖": ["xy", "translate(-100vw, -100dvh)"],
  "↑": ["y", "translateY(-100dvh)"],
  "↗": ["xy", "translate(100vw, -100dvh)"]
};

const attrs = { x: "data-swipe-x", y: "data-swipe-y", xy: "data-swipe-xy" };

const fade = (element, out = false) => {
  if (reduce.matches) {
    return Promise.resolve();
  }

  const opacity = out ? [1, 0] : [0, 1];

  const options = {
    duration: 160,
    easing: out ? "ease-in" : "ease-out",
    fill: out ? "forwards" : "none"
  };

  const animations = [...element.children].map((item) =>
    item.animate({ opacity }, options).finished.catch(() => {})
  );

  return Promise.all(animations);
};

const text = (tag, name, key) => {
  const element = dom.create(tag);
  element.className = name;

  if (key) {
    dom.set(element, "data-i18n", key);
  }

  return element;
};

const insert = (target, content) => {
  if (content instanceof Node) {
    target.append(content);

    return;
  }

  target.append(text("span", "", content));
};

const action = ({ text: key, icon, data = [] }, wearable) => {
  const button = dom.create("button");
  button.type = "button";
  dom.set(button, "data-feedback", "");
  data.forEach((name) => {
    dom.set(button, name, "");
  });

  const label = text("span", "dialog-label", key);
  button.append(label);

  if (wearable) {
    dom.set(button, "data-circle", "");

    if (icon) {
      dom.set(button, "data-icon", icon);
    }
  }

  return button;
};

const build = ({ title, content, actions = [], fullscreen }) => {
  const wearable = dom.has("wearable");
  const wrap = dom.create("div");
  const element = dom.create("dialog");
  dom.set(element, "data-dialog", "");

  if (fullscreen || wearable) {
    dom.set(element, "data-fullscreen", "");
  }

  const head = dom.create("header");
  head.className = "dialog-head";

  const heading = text("h2", "dialog-title", title);
  dom.set(heading, "tabindex", "-1");
  head.append(heading);

  const body = dom.create("div");
  body.className = "dialog-content";
  insert(body, content);

  const footer = dom.create("footer");
  footer.className = "dialog-actions";

  const buttons = actions.map((item) => action(item, wearable));
  footer.append(...buttons);
  element.append(head, body);

  if (buttons.length) {
    element.append(footer);
  }

  wrap.append(element);

  return { wrap, element, heading, buttons };
};

const slide = (element, exit) => {
  const dark = dom.get(element, "data-fullscreen") !== null;

  const animation = element.animate(
    [{ transform: "translate(0)" }, { transform: exit }],
    { duration: 1000, fill: "both" }
  );
  animation.pause();
  animation.currentTime = 0;
  light(0, dark);

  let frame;
  let progress = 0;
  let done;

  const update = (value) => {
    progress = value;
    animation.currentTime = progress * 1000;
    light(progress, dark);
  };

  const cancel = () => {
    cancelAnimationFrame(frame);
    frame = undefined;
    done?.();
    done = undefined;
  };

  const settle = (target) =>
    new Promise((finish) => {
      cancel();
      done = finish;

      const from = progress;

      if (reduce.matches || from === target) {
        update(target);
        done();
        done = undefined;

        return;
      }

      const start = performance.now();

      const duration = 180 * Math.max(0.4, Math.abs(target - from));

      const run = (now) => {
        const time = Math.min(1, (now - start) / duration);

        const ease = 1 - Math.pow(1 - time, 3);
        update(from + (target - from) * ease);

        if (time < 1) {
          frame = requestAnimationFrame(run);

          return;
        }

        done();
        done = undefined;
      };
      frame = requestAnimationFrame(run);
    });

  const stop = () => {
    cancel();
    animation.cancel();
  };

  return { cancel, settle, stop, update };
};

const measure = (element, axis) => {
  const { width, height } = viewport();

  if (axis === "x") {
    return [width, element.clientWidth];
  }

  if (axis === "y") {
    return [height, element.clientHeight];
  }

  return [
    Math.hypot(width, height),
    Math.hypot(element.clientWidth, element.clientHeight)
  ];
};

const dismiss = (element, direction, close) => {
  const arrow = getDirection(direction);

  if (!arrow) {
    return () => {};
  }

  const [axis, exit] = motions[arrow];
  const length = () => measure(element, axis)[0];

  const ratio = () => {
    const [total, size] = measure(element, axis);

    return total ? Math.min(0.35, (size / total) * 0.35) : 0.35;
  };
  dom.set(element, attrs[axis], "");

  const motion = slide(element, exit);

  const off = swipe(arrow, {
    target: element,
    ignore: ".dialog-title, .dialog-content > *, a, button",
    length,
    ratio,
    start: () => {
      motion.cancel();
      dom.set(element, "data-swipe", "");
    },
    move: motion.update,
    reach: () => {
      vibrate.play(25);
    },
    end: async (complete) => {
      await motion.settle(complete ? 1 : 0);
      dom.remove(element, "data-swipe");

      if (complete) {
        close();

        return;
      }
    }
  });

  return () => {
    off();
    motion.stop();
  };
};

export default async function dialog({
  title,
  content,
  actions = [],
  loading,
  fullscreen = false,
  direction
} = {}) {
  const stopLoading = load(loading);

  const { wrap, element, heading, buttons } = build({
    title,
    content,
    actions,
    fullscreen
  });
  dom.body.append(wrap);
  mount(element);

  const translated = await translate().catch(() => false);

  if (!translated) {
    wrap.remove();
    stopLoading();

    return false;
  }

  return new Promise((finish) => {
    let done = false;

    let offBack;
    let offSwipe;

    const close = async (value = false, smooth = true) => {
      if (done) {
        return;
      }

      done = true;
      offSwipe?.();
      offBack?.();

      if (smooth) {
        await fade(element, true);
      }

      if (element.open) {
        element.close();
      }

      wrap.remove();
      light();
      stopLoading();
      finish(value);
    };
    actions.forEach((item, index) => {
      dom.on(buttons[index], "click", () => close(item.value));
    });
    dom.on(element, "cancel", (event) => {
      event.preventDefault();
      close(false);
    });
    offBack = back.add(() => {
      close(false);
    });
    element.showModal();
    fade(element);
    heading.focus({ preventScroll: true });
    offSwipe = dismiss(element, direction, () => {
      close(false, false);
    });
  });
}
