import * as back from "#common/back";
import * as dom from "#common/dom";
import translate from "#common/i18n";
import load, { light } from "#common/loading";
import mount from "#common/mount";
import swipe, { resolve } from "#common/swipe";
import vibrate from "#common/vibrate";
import viewport from "#common/viewport";

const reduce = matchMedia(
  "(prefers-reduced-motion: reduce)"
);
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
const attrs = {
  x: "data-swipe-x",
  y: "data-swipe-y",
  xy: "data-swipe-xy"
};
const types = {
  dialog: "data-dialog",
  popover: "data-popover",
  drawer: "data-drawer",
  sheet: "data-sheet"
};
const text = (tag, name, key) => {
  const element = dom.create(tag);

  element.className = name;

  if (key) {
    dom.set(element, "data-i18n", key);
  }

  return element;
};
const insert = (target, content, name) => {
  if (content instanceof Node) {
    target.append(content);
    return;
  }

  target.append(text("span", name, content));
};
const action = (item, type, wearable) => {
  const { text: key, icon, data = [] } = item;
  const name = type === "dialog" ? "dialog" : "layer";
  const button = dom.create("button");

  button.type = "button";
  dom.set(button, "data-response", "");

  data.forEach((value) => dom.set(button, value, ""));

  if (wearable) {
    dom.set(button, "data-circle", "");
  }

  if (icon && (type !== "dialog" || wearable)) {
    dom.set(button, "data-icon", icon);
  }

  button.append(text("span", `${name}-label`, key));
  return button;
};
const build = (type, options) => {
  const { title, content, actions = [] } = options;
  const dialog = type === "dialog";
  const name = dialog ? "dialog" : "layer";
  const wearable = dialog && dom.has("wearable");
  const wrap = dom.create("div");
  const element = dom.create("dialog");

  dom.set(element, types[type], "");
  dom.set(element, "closedby", "none");

  if (options.fullscreen || wearable) {
    dom.set(element, "data-fullscreen", "");
  }

  if (options.side) {
    dom.set(element, "data-side", options.side);
  }

  if (options.size) {
    element.style.setProperty("--layer-size", options.size);
  }

  const head = dom.create("header");

  head.className = `${name}-head`;

  const heading = text("h2", `${name}-title`, title);

  if (dialog) {
    dom.set(heading, "tabindex", "-1");
    dom.set(heading, "autofocus", "");
  }

  if (title || dialog) {
    head.append(heading);
  }

  const body = dom.create("div");

  body.className = `${name}-content`;
  insert(body, content, dialog ? "" : "layer-text");

  const footer = dom.create("footer");

  footer.className = `${name}-actions`;
  const buttons = actions.map((item) =>
    action(item, type, wearable)
  );

  if (dialog) {
    const validate = () => {
      actions.forEach((item, index) => {
        const value = item.disabled;

        buttons[index].disabled =
          typeof value === "function"
            ? value()
            : Boolean(value);
      });
    };

    validate();
    dom.on(body, "input", validate);
  }

  footer.append(...buttons);

  if (title || dialog) {
    element.append(head);
  }

  element.append(body);

  if (buttons.length) {
    element.append(footer);
  }

  wrap.append(element);
  return { wrap, element, heading, buttons };
};
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
    item
      .animate({ opacity }, options)
      .finished.catch(() => {})
  );

  return Promise.all(animations);
};
const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);
const anchorRect = (anchor) =>
  anchor instanceof Element
    ? anchor.getBoundingClientRect()
    : null;
const place = (element, anchor) => {
  const view = viewport();
  const rect = anchorRect(anchor);
  const margin = 16;
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const scale = rect
    ? Math.max(
        0.1,
        Math.min(rect.width / width, rect.height / height)
      )
    : 0.2;

  if (element.hasAttribute("data-fullscreen")) {
    const x = rect
      ? rect.left + rect.width / 2
      : view.width / 2;
    const y = rect
      ? rect.top + rect.height / 2
      : view.height / 2;

    element.style.transformOrigin = `${x}px ${y}px`;
    return scale;
  }

  const maxX = Math.max(
    margin,
    view.width - width - margin
  );
  const maxY = Math.max(
    margin,
    view.height - height - margin
  );
  const left = clamp(
    (view.width - width) / 2,
    margin,
    maxX
  );
  const top = clamp(
    (view.height - height) / 2,
    margin,
    maxY
  );

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;

  const x = rect
    ? rect.left + rect.width / 2 - left
    : width / 2;
  const y = rect
    ? rect.top + rect.height / 2 - top
    : height / 2;

  element.style.transformOrigin = `${x}px ${y}px`;
  return scale;
};
const enter = (element, type, anchor) => {
  const scale =
    type === "popover" ? place(element, anchor) : 1;

  if (reduce.matches) {
    return null;
  }

  const keyframes = {
    popover: [
      { opacity: 0, transform: `scale(${scale})` },
      { opacity: 1, transform: "scale(1)" }
    ],
    drawer: [
      {
        transform:
          dom.get(element, "data-side") === "right"
            ? "translateX(100vw)"
            : "translateX(-100vw)"
      },
      { transform: "translateX(0)" }
    ],
    sheet: [
      { transform: "translateY(100dvh)" },
      { transform: "translateY(0)" }
    ]
  }[type];

  return element.animate(keyframes, {
    duration: 240,
    easing: "ease-out",
    fill: "both"
  });
};
const length = (element, axis, screen = false) => {
  const { width, height } = viewport();

  if (axis === "x") {
    return screen ? width : element.clientWidth;
  }

  if (axis === "y") {
    return screen ? height : element.clientHeight;
  }

  return screen
    ? Math.hypot(width, height)
    : Math.hypot(element.clientWidth, element.clientHeight);
};
const dismiss = (
  element,
  type,
  direction,
  close,
  stopOpening
) => {
  const arrow = resolve(direction);

  if (!arrow || !motions[arrow]) {
    return () => {};
  }

  const dialog = type === "dialog";
  const dark =
    dialog && dom.get(element, "data-fullscreen") !== null;
  const [axis, exit] = motions[arrow];

  dom.set(element, attrs[axis], "");

  let animation;
  let frame;
  let progress = 0;
  let done;
  const update = (value) => {
    progress = value;

    if (animation) {
      animation.currentTime = value * 1000;
    }

    if (dialog) {
      light(value, dark);
    }
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
      const duration =
        180 * Math.max(0.4, Math.abs(target - from));
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
    animation?.cancel();
    animation = undefined;

    if (dialog) {
      light();
    }
  };
  const ratio = () => {
    if (!dialog) {
      return 0.35;
    }

    const total = length(element, axis, true);
    const size = length(element, axis);

    return total
      ? Math.min(0.35, (size / total) * 0.35)
      : 0.35;
  };
  const off = swipe(arrow, {
    target: element,
    ignore: dialog
      ? ".dialog-title, .dialog-content > *, a, button"
      : ".layer-head, .layer-content > *, a, button",
    length: () => length(element, axis, dialog),
    ratio,
    start: () => {
      stopOpening?.();
      animation = element.animate(
        [
          { transform: "translate(0)" },
          { transform: exit }
        ],
        { duration: 1000, fill: "both" }
      );
      animation.pause();
      animation.currentTime = 0;
      dom.set(element, "data-swipe", "");
    },
    move: update,
    reach: () => vibrate.play(25),
    end: async (complete) => {
      dom.remove(element, "data-swipe");
      await settle(complete ? 1 : 0);

      if (complete) {
        close(false, false);
      }
    }
  });

  return () => {
    off();
    stop();
  };
};

export default async function layer(type, options = {}) {
  const { actions = [] } = options;
  const dialog = type === "dialog";
  const locked = options.locked !== false;
  const { wrap, element, heading, buttons } = build(
    type,
    options
  );
  const release = load();

  dom.body.append(wrap);
  mount(element);

  const translated = await translate().catch(() => false);

  if (!translated) {
    wrap.remove();
    release();
    return false;
  }

  return new Promise((finish) => {
    let closed = false;
    let opening;
    const off = [];
    const close = async (value = false, smooth = true) => {
      if (closed) {
        return;
      }

      closed = true;
      off.forEach((remove) => remove());

      if (smooth && dialog) {
        await fade(element, true);
      } else if (smooth && opening && !reduce.matches) {
        opening.reverse();
        await opening.finished.catch(() => {});
      }

      if (element.open) {
        element.close();
      }

      wrap.remove();

      if (dialog) {
        light();
      }

      release();
      finish(value);
    };

    actions.forEach((item, index) => {
      off.push(
        dom.on(buttons[index], "click", () =>
          close(item.value)
        )
      );
    });

    if (dialog) {
      off.push(
        dom.on(element, "cancel", (event) =>
          event.preventDefault()
        )
      );
    }

    if (type === "popover" || type === "sheet") {
      off.push(
        dom.on(element, "click", (event) => {
          if (event.target !== element) {
            return;
          }

          const rect = element.getBoundingClientRect();
          const inside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;

          if (!inside) {
            close(false);
          }
        })
      );
    }

    element.showModal();

    if (dialog) {
      fade(element);
    } else {
      opening = enter(element, type, options.anchor);
    }

    if (type === "popover") {
      const center = () => place(element, options.anchor);

      off.push(dom.on(window, "resize", center));
      off.push(
        dom.on(window.visualViewport, "resize", center)
      );
    }

    off.push(
      back.add(() => {
        if (!locked) {
          return false;
        }

        return close(false);
      })
    );

    if (locked && options.direction) {
      off.push(
        dismiss(
          element,
          type,
          options.direction,
          close,
          () => opening?.finish()
        )
      );
    }
  });
}
