import * as back from "#common/back";
import * as dom from "#common/dom";
import translate from "#common/i18n";
import mount from "#common/mount";
import overlay from "#common/overlay";
import snap from "#common/sheet/snap";
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

const action = (item, wearable) => {
  const { text: key, icon, data = [] } = item;
  const button = dom.create("button");

  button.type = "button";
  dom.set(button, "data-response", "");

  data.forEach((value) => dom.set(button, value, ""));

  if (wearable && icon) {
    dom.set(button, "data-circle", "");
    dom.set(button, "data-icon", icon);
  }

  button.append(text("span", "layer-label", key));
  return button;
};

const build = (type, options) => {
  const { title, content, actions = [] } = options;
  const dialog = type === "dialog";
  const name = dialog ? "dialog" : "layer";
  const wearable = dom.has("wearable");
  const wrap = dom.create("div");
  const element = dom.create("dialog");

  dom.set(element, types[type], "");
  dom.set(element, "closedby", "none");

  if (!dialog) {
    dom.set(element, "tabindex", "-1");
  }

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

  footer.className = "layer-actions";
  const buttons = actions.map((item) =>
    action(item, wearable)
  );

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

const anchorRect = (anchor) =>
  anchor instanceof Element
    ? anchor.getBoundingClientRect()
    : null;

const origin = (element, anchor) => {
  const rect = anchorRect(anchor);
  const box = element.getBoundingClientRect();
  const { width, height } = box;
  const scale = rect
    ? Math.max(
        0.1,
        Math.min(rect.width / width, rect.height / height)
      )
    : 0.2;

  const x = rect
    ? rect.left + rect.width / 2 - box.left
    : width / 2;

  const y = rect
    ? rect.top + rect.height / 2 - box.top
    : height / 2;

  element.style.transformOrigin = `${x}px ${y}px`;
  return scale;
};

const enter = (element, type, anchor) => {
  const scale =
    type === "popover" ? origin(element, anchor) : 1;

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

const strength = (element) => {
  const rect = element.getBoundingClientRect();
  const screen = viewport();
  const total = screen.width * screen.height;
  const area = rect.width * rect.height;

  return total ? Math.min(1, Math.max(0, area / total)) : 0;
};

const dismiss = (element, type, options) => {
  const { dir, close, finish, shade } = options;
  const arrow = resolve(dir);

  if (!arrow || !motions[arrow]) {
    return () => {};
  }

  const dialog = type === "dialog";
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

    shade(value);
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
  };

  const ratio = () => {
    const total = length(element, axis, true);
    const size = length(element, axis);

    return total
      ? Math.min(0.35, (size / total) * 0.35)
      : 0.35;
  };

  const content =
    ":is(.dialog-content, .layer-content) > " +
    ":not([data-pan]), a, button";

  const select =
    ":is(.dialog-title, .layer-title), " + "[data-pan] > *";

  const off = swipe(arrow, {
    target: element,
    ignore: (event) =>
      event.pointerType === "mouse"
        ? `${select}, ${content}`
        : content,
    length: () => length(element, axis, true),
    ratio,
    start: () => {
      finish?.();
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
  const { actions = [], scroll } = options;
  const dialog = type === "dialog";
  const locked = options.locked === true;
  const trigger =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  const keyboard =
    trigger?.matches(":focus-visible") === true;

  const { wrap, element, heading, buttons } = build(
    type,
    options
  );

  const release = overlay();

  dom.body.append(wrap);
  mount(element);

  const translated = await translate().catch(() => false);

  if (!translated) {
    wrap.remove();
    await release();
    return false;
  }

  return new Promise((finish) => {
    let opening;
    let closed = false;

    const off = [];
    const clearFocus = () => {
      if (
        trigger &&
        !keyboard &&
        document.activeElement === trigger
      ) {
        trigger.blur();
      }
    };

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

      clearFocus();
      wrap.remove();

      await release();
      clearFocus();
      finish(value);
    };

    actions.forEach((item, index) => {
      off.push(
        dom.on(buttons[index], "click", async () => {
          const result = await item.run?.({
            element,
            button: buttons[index],
            close
          });

          if (item.close === false || result === false) {
            return;
          }

          close(result ?? item.value);
        })
      );
    });

    off.push(
      dom.on(element, "click", (event) => {
        const button = event.target.closest?.(
          "button:enabled[data-layer-action]"
        );

        if (!button || !element.contains(button)) {
          return;
        }

        close(dom.get(button, "data-layer-action"));
      })
    );

    if (dialog) {
      off.push(
        dom.on(element, "cancel", (event) =>
          event.preventDefault()
        )
      );
    }

    if (
      !locked &&
      (type === "popover" || type === "sheet")
    ) {
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

    window.getSelection()?.removeAllRanges();
    element.showModal();

    const updateOverlay = () =>
      release.strength(strength(element));

    updateOverlay();
    off.push(dom.on(window, "resize", updateOverlay));

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(updateOverlay);

      observer.observe(element);
      off.push(() => observer.disconnect());
    }

    if (!dialog) {
      element.focus({ preventScroll: true });
    }

    element.scrollTop = Number.isFinite(scroll)
      ? scroll
      : 0;

    options.ready?.(element, close);

    if (dialog) {
      fade(element);
    } else {
      opening = enter(element, type, options.anchor);
    }

    if (type === "popover") {
      const update = () => origin(element, options.anchor);

      off.push(dom.on(window, "resize", update));
    }

    off.push(
      back.add(() => {
        if (locked) {
          return false;
        }

        return close(false);
      })
    );

    if (
      !locked &&
      type === "sheet" &&
      !dom.has("wearable") &&
      options.snap !== false
    ) {
      off.push(
        snap(element, {
          stage: options.stage,
          close,
          finish: () => opening?.finish()
        })
      );
    } else if (!locked && options.direction) {
      off.push(
        dismiss(element, type, {
          dir: options.direction,
          close,
          finish: () => opening?.finish(),
          shade: release.shade
        })
      );
    }
  });
}
