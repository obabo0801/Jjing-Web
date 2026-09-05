import * as css from "#common/css";
import * as dom from "#common/dom";
import swipe from "#common/swipe";
import vibrate from "#common/vibrate";

const stages = ["peek", "half", "full"];

const index = (value) => {
  const result = stages.indexOf(value);

  return result < 0 ? 1 : result;
};

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const points = () => {
  const height = window.innerHeight;
  const rem =
    Number.parseFloat(
      getComputedStyle(dom.root).fontSize
    ) || 16;
  const half = height * 0.5;
  const peek = Math.min(
    half,
    Math.min(rem * 12, Math.max(rem * 6, height * 0.2))
  );

  return [peek, half, height * 0.9];
};

const nearest = (height, sizes) => {
  const target = sizes.reduce((result, size) =>
    Math.abs(size - height) < Math.abs(result - height)
      ? size
      : result
  );

  return Math.abs(target - height) <= 48 ? target : height;
};

export default function snap(element, options = {}) {
  const initial = index(options.stage);

  let sizes = points();
  let height = sizes[initial];
  let resizeFrame;
  let gesture = null;

  const render = (value) => {
    height = clamp(value, sizes[0], sizes[2]);
    css.set(element, { "--sheet-height": `${height}px` });
  };

  const configure = () => {
    const ratio = sizes[2] ? height / sizes[2] : 1;

    sizes = points();
    render(nearest(sizes[2] * ratio, sizes));
  };

  const blocked = (step) => {
    const top = element.scrollTop;
    const max = element.scrollHeight - element.clientHeight;
    const up = step > 0;
    const full = height >= sizes[2] - 1;
    const scrolling = full && (up ? top < max : top > 0);

    if ((up && full) || scrolling) {
      return "*";
    }

    return "button, a";
  };

  const resize = () => {
    if (gesture || resizeFrame) {
      return;
    }

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = undefined;

      if (!gesture) {
        configure();
      }
    });
  };

  const stop = () => {
    gesture = null;
    dom.remove(element, "data-swipe");
  };

  const finish = (value, cancelled) => {
    if (!gesture) {
      return;
    }

    const { from, target } = gesture;

    if (cancelled) {
      stop();
      render(from);
    } else {
      const next = from + (target - from) * value;

      if (target === 0 && next < sizes[0] * 0.5) {
        stop();
        options.close?.(false, false);
        return;
      }

      const snapped = nearest(next, sizes);

      stop();
      render(snapped);

      if (from < sizes[2] - 1 && snapped === sizes[2]) {
        vibrate.play(25);
      }
    }

    configure();
  };

  const bind = (direction, step) =>
    swipe(direction, {
      target: element,
      ignore: () => blocked(step),
      length: () =>
        gesture
          ? Math.abs(gesture.target - gesture.from) || 1
          : 1,
      start: () => {
        options.finish?.();
        gesture = {
          from: element.getBoundingClientRect().height,
          target: step > 0 ? sizes[2] : 0
        };
        dom.set(element, "data-swipe", "");
      },
      move: (value) => {
        if (!gesture) {
          return;
        }

        const next =
          gesture.from +
          (gesture.target - gesture.from) * value;

        height = next;
        css.set(element, { "--sheet-height": `${next}px` });
      },
      end: (_complete, value, _event, cancelled) =>
        finish(value, cancelled)
    });

  render(height);

  const remove = [
    bind("↑", 1),
    bind("↓", -1),
    dom.on(window, "resize", resize)
  ];

  return () => {
    remove.forEach((off) => off());
    cancelAnimationFrame(resizeFrame);
    gesture = null;
    css.set(element, { "--sheet-height": null });
    dom.remove(element, "data-swipe");
  };
}
