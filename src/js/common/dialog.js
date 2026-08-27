import * as dom from "#common/dom";
import * as back from "#common/back";
import translate from "#common/i18n";
import load, { light } from "#common/loading";
import swipe, {
  resolve as getDirection
} from "#common/swipe";
import vibrate from "#common/vibrate";

const reduce = matchMedia(
  "(prefers-reduced-motion: reduce)"
);

const motions = {
  "→": ["x", "translateX(100%)"],
  "↘": ["xy", "translate(100%, 100%)"],
  "↓": ["y", "translateY(100%)"],
  "↙": ["xy", "translate(-100%, 100%)"],
  "←": ["x", "translateX(-100%)"],
  "↖": ["xy", "translate(-100%, -100%)"],
  "↑": ["y", "translateY(-100%)"],
  "↗": ["xy", "translate(100%, -100%)"]
};

const text = (tag, name, key) => {
  const element = dom.create(tag);

  element.className = name;

  if (key) {
    dom.set(element, "data-i18n", key);
  }

  return element;
};

const action = (
  { text: key, icon, data = [] },
  wearable
) => {
  const button = dom.create("button");

  button.type = "button";

  dom.set(button, "data-feedback", "");

  data.forEach((name) => {
    dom.set(button, `data-${name}`, "");
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

const build = ({
  title,
  content,
  actions = [],
  fullscreen
}) => {
  const wearable = dom.root.classList.contains("wearable");

  const element = dom.create("dialog");

  dom.set(element, "data-dialog", "");

  if (fullscreen || wearable) {
    dom.set(element, "data-fullscreen", "");
  }

  const head = dom.create("header");

  head.className = "dialog-head";

  const heading = text("h2", "dialog-title", title);

  head.append(heading);

  const body = text("div", "dialog-content", content);

  const footer = dom.create("footer");

  footer.className = "dialog-actions";

  const buttons = actions.map((item) =>
    action(item, wearable)
  );

  footer.append(...buttons);

  element.append(head, body);

  if (buttons.length) {
    element.append(footer);
  }

  return { element, buttons };
};

const slide = (element, exit) => {
  const animation = element.animate(
    [{ transform: "translate(0)" }, { transform: exit }],
    { duration: 1000, fill: "both" }
  );

  animation.pause();
  animation.currentTime = 0;

  let frame;
  let progress = 0;
  let done;

  const update = (value) => {
    progress = value;

    animation.currentTime = progress * 1000;

    light(progress);
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

    animation.cancel();

    light();
  };

  return { cancel, settle, stop, update };
};

const dismiss = (element, direction, close) => {
  const arrow = getDirection(direction) ?? "←";
  const [axis, exit] = motions[arrow];

  dom.set(element, `data-swipe-${axis}`, "");

  const motion = slide(element, exit);

  const off = swipe(arrow, {
    target: element,
    threshold: 0.35,
    mouse: true,

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
  direction = "left"
} = {}) {
  const stopLoading = load(loading);

  const { element, buttons } = build({
    title,
    content,
    actions,
    fullscreen
  });

  dom.body.append(element);

  const translated = await translate().catch(() => false);

  if (!translated) {
    element.remove();
    stopLoading();

    return false;
  }

  return new Promise((finish) => {
    let done = false;

    let offBack;
    let offSwipe;

    const close = (value = false) => {
      if (done) {
        return;
      }

      done = true;

      offSwipe?.();
      offBack?.();

      if (element.open) {
        element.close();
      }

      element.remove();

      light();
      stopLoading();

      finish(value);
    };

    actions.forEach((item, index) => {
      dom.on(buttons[index], "click", () => {
        close(item.value);
      });
    });

    dom.on(element, "cancel", (event) => {
      event.preventDefault();

      close(false);
    });

    offBack = back.add(() => {
      close(false);
    });

    element.showModal();

    if (dom.get(element, "data-fullscreen") !== null) {
      offSwipe = dismiss(element, direction, () => {
        close(false);
      });
    }
  });
}
