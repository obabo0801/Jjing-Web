import * as dom from "#common/dom";

const reduce = matchMedia(
  "(prefers-reduced-motion: reduce)"
);

const clamp = (value) =>
  Math.min(1, Math.max(0, Number(value) || 0));

const create = () => {
  const wrap = dom.create("div");
  const element = dom.create("dialog");

  dom.set(element, "data-overlay", "");
  dom.set(element, "closedby", "none");

  dom.on(element, "cancel", (event) =>
    event.preventDefault()
  );

  wrap.append(element);
  dom.body.append(wrap);

  return { wrap, element };
};

export default function overlay() {
  const { wrap, element } = create();

  let backdrop;
  let frame;
  let done;
  let level = 0;
  let strength = 0;
  let closed = false;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = undefined;
    done?.();
    done = undefined;
  };

  const keyframes = () => {
    const theme = getComputedStyle(dom.root);
    const shade = theme.getPropertyValue("--shade").trim();
    const percent = Math.round(strength * 100);
    const color =
      percent === 0
        ? shade
        : percent === 100
          ? "#000000"
          : `color-mix(in srgb, ${shade}, #000 ${percent}%)`;

    return [
      { backgroundColor: "transparent" },
      { backgroundColor: color }
    ];
  };

  const animation = () => {
    if (backdrop) {
      return backdrop;
    }

    backdrop = element.animate(keyframes(), {
      duration: 1,
      fill: "both",
      pseudoElement: "::backdrop"
    });

    backdrop.pause();
    backdrop.currentTime = level;

    return backdrop;
  };

  const paint = (value) => {
    const current = animation();

    level = clamp(value);
    current.pause();
    current.currentTime = level;
  };

  const move = (target) =>
    new Promise((finish) => {
      stop();
      done = finish;

      target = clamp(target);

      const from = level;

      if (reduce.matches || from === target) {
        paint(target);
        done();
        done = undefined;
        return;
      }

      const start = performance.now();
      const duration =
        160 * Math.max(0.4, Math.abs(target - from));

      const run = (now) => {
        const time = Math.min(1, (now - start) / duration);
        const ease = 1 - Math.pow(1 - time, 3);

        paint(from + (target - from) * ease);

        if (time < 1) {
          frame = requestAnimationFrame(run);
          return;
        }

        frame = undefined;
        done();
        done = undefined;
      };

      frame = requestAnimationFrame(run);
    });

  element.showModal();
  move(1);

  const release = async () => {
    if (closed) {
      return;
    }

    closed = true;

    await move(0);
    stop();

    if (element.open) {
      element.close();
    }

    backdrop?.cancel();
    wrap.remove();
  };

  release.shade = (value = 0) => {
    stop();
    paint(1 - clamp(value));
  };

  release.strength = (value = 0) => {
    strength = clamp(value);
    backdrop?.effect?.setKeyframes(keyframes());
  };

  return release;
}
