import * as dom from "#common/dom";
import swipe from "#common/swipe";
import vibrate from "#common/vibrate";
import viewport from "#common/viewport";

const reduce = matchMedia(
  "(prefers-reduced-motion: reduce)"
);
const stages = ["peek", "half", "full"];

const index = (value) => {
  const result = stages.indexOf(value);

  return result < 0 ? 1 : result;
};

const points = () => {
  const { height } = viewport();
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

export default function snap(element, options = {}) {
  let stage = index(options.stage);
  let animation;
  let settling = false;
  let disposed = false;
  let from = 0;
  let target = stage;
  let targetHeight = 0;

  const configure = () => {
    const [peek, half, full] = points();

    element.style.setProperty("--sheet-peek", `${peek}px`);
    element.style.setProperty("--sheet-half", `${half}px`);
    element.style.setProperty("--sheet-full", `${full}px`);
  };

  const render = () => {
    dom.set(element, "data-sheet-stage", stages[stage]);
  };

  const settle = async (next) => {
    const closing = next < 0;
    const height = closing ? 0 : points()[next];

    settling = true;
    animation = element.animate(
      [
        {
          height: `${element.getBoundingClientRect().height}px`
        },
        { height: `${height}px` }
      ],
      {
        duration: reduce.matches ? 0 : 200,
        easing: "ease-out",
        fill: "forwards"
      }
    );

    await animation.finished.catch(() => {});

    if (disposed) {
      return;
    }

    if (closing) {
      animation.cancel();
      animation = undefined;
      settling = false;
      element.style.removeProperty("height");
      dom.remove(element, "data-sheet-drag");
      options.close?.(false, false);
      return;
    }

    stage = next;
    render();
    element.style.height = `${height}px`;
    animation.cancel();
    animation = undefined;
    settling = false;
    element.style.removeProperty("height");
    dom.remove(element, "data-sheet-drag");
  };

  const blocked = (step) => {
    const top = element.scrollTop;
    const max = element.scrollHeight - element.clientHeight;
    const up = step > 0;
    const full = stage === stages.length - 1;
    const scrolling = up ? top < max : top > 0;

    if (settling || (up && full) || scrolling) {
      return "*";
    }

    return "button, a";
  };

  const bind = (direction, step) =>
    swipe(direction, {
      target: element,
      ignore: () => blocked(step),
      length: () => {
        const next = stage + step;
        const height = next < 0 ? 0 : points()[next];

        return Math.abs(height - points()[stage]) || 1;
      },
      ratio: 0.25,
      start: () => {
        options.finish?.();
        from = element.getBoundingClientRect().height;
        target = stage + step;
        targetHeight = target < 0 ? 0 : points()[target];
        dom.set(element, "data-sheet-drag", "");
      },
      move: (value) => {
        const height = from + (targetHeight - from) * value;

        element.style.height = `${height}px`;
      },
      reach: () => vibrate.play(25),
      end: (complete) => {
        settle(complete ? target : stage);
      }
    });

  configure();
  render();

  const remove = [
    bind("↑", 1),
    bind("↓", -1),
    dom.on(window, "resize", configure)
  ];

  if (window.visualViewport) {
    remove.push(
      dom.on(window.visualViewport, "resize", configure)
    );
  }

  return () => {
    disposed = true;
    remove.forEach((off) => off());
    animation?.cancel();
    element.style.removeProperty("height");
    dom.remove(element, "data-sheet-drag");
  };
}
