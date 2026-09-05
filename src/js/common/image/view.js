import * as css from "#common/css";
import * as dom from "#common/dom";
import popover from "#common/popover";
import double from "#common/image/double";

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const distance = ([first, second]) =>
  Math.hypot(second.x - first.x, second.y - first.y);

const midpoint = ([first, second]) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2
});

const prevent = (event) => event.preventDefault();

export default async function view(source, anchor) {
  if (!source) {
    return false;
  }

  const root = dom.create("div");
  const stage = dom.create("div");
  const image = dom.create("img");

  root.className = "image-view";
  stage.className = "image-view-stage";
  image.className = "image-view-media";
  image.alt = "";
  image.draggable = false;
  dom.set(root, "data-drag", "none");

  stage.append(image);
  root.append(stage);

  const state = {
    scale: 1,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pointers: new Map(),
    pan: null,
    pinch: null,
    frame: null
  };

  const paint = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const imageWidth = image.naturalWidth || width;
    const imageHeight = image.naturalHeight || height;
    const fit = Math.min(
      width / imageWidth,
      height / imageHeight
    );

    const limitX = Math.max(
      0,
      (imageWidth * fit * state.scale - root.clientWidth) /
        2
    );

    const limitY = Math.max(
      0,
      (imageHeight * fit * state.scale -
        root.clientHeight) /
        2
    );

    state.x = clamp(state.x, -limitX, limitX);
    state.y = clamp(state.y, -limitY, limitY);

    css.set(root, {
      "--image-x": `${state.x}px`,
      "--image-y": `${state.y}px`,
      "--image-scale": state.scale
    });
  };

  const render = () => {
    if (state.frame) {
      return;
    }

    state.frame = requestAnimationFrame(() => {
      state.frame = null;
      paint();
    });
  };

  const measure = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;

    if (state.width && state.height) {
      state.x *= width / state.width;
      state.y *= height / state.height;
    }

    state.width = width;
    state.height = height;
    render();
  };

  const point = (event) => {
    const rect = root.getBoundingClientRect();

    return {
      x:
        (event.clientX - rect.left) *
          (root.clientWidth / rect.width) -
        root.clientWidth / 2,
      y:
        (event.clientY - rect.top) *
          (root.clientHeight / rect.height) -
        root.clientHeight / 2
    };
  };

  const zoom = (value, center) => {
    const next = clamp(value, 1, 4);
    const ratio = next / state.scale;

    state.x = center.x + (state.x - center.x) * ratio;
    state.y = center.y + (state.y - center.y) * ratio;
    state.scale = next;
    render();
  };

  const gesture = double(root, {
    scale: () => state.scale,
    point,
    zoom
  });

  const beginPinch = () => {
    const points = [...state.pointers.values()].slice(0, 2);

    state.pinch = {
      distance: distance(points) || 1,
      scale: state.scale,
      x: state.x,
      y: state.y,
      center: midpoint(points)
    };
    state.pan = null;
    dom.remove(root, "data-moving");
  };

  const release = (event) => {
    if (!state.pointers.has(event.pointerId)) {
      return;
    }

    state.pointers.delete(event.pointerId);
    state.pinch = null;

    if (state.pointers.size === 1) {
      const [id, current] = state.pointers
        .entries()
        .next().value;

      state.pan = { id, ...current };
      dom.set(root, "data-moving", "");
    } else {
      state.pan = null;
      dom.remove(root, "data-moving");
    }
  };

  const off = [
    dom.on(image, "load", render),
    dom.on(window, "resize", measure),
    dom.on(root, "dragstart", prevent),
    dom.on(
      root,
      "wheel",
      (event) => {
        if (event.ctrlKey) {
          return;
        }

        event.preventDefault();
        zoom(
          state.scale *
            Math.exp(
              -event.deltaY *
                (event.deltaMode === 1
                  ? 0.024
                  : event.deltaMode === 2
                    ? 0.25
                    : 0.0015)
            ),
          point(event)
        );
      },
      { passive: false }
    ),
    dom.on(root, "pointerdown", (event) => {
      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      event.preventDefault();
      const current = point(event);

      state.pointers.set(event.pointerId, current);
      root.setPointerCapture(event.pointerId);

      if (state.pointers.size === 1) {
        state.pan = { id: event.pointerId, ...current };
        dom.set(root, "data-moving", "");
      } else if (state.pointers.size === 2) {
        beginPinch();
      }
    }),
    dom.on(root, "pointermove", (event) => {
      if (!state.pointers.has(event.pointerId)) {
        return;
      }

      const current = point(event);

      state.pointers.set(event.pointerId, current);

      if (state.pointers.size >= 2 && state.pinch) {
        const points = [...state.pointers.values()].slice(
          0,
          2
        );

        const center = midpoint(points);
        const next = clamp(
          state.pinch.scale *
            (distance(points) / state.pinch.distance),
          1,
          4
        );
        const ratio = next / state.pinch.scale;

        state.x =
          center.x +
          (state.pinch.x - state.pinch.center.x) * ratio;

        state.y =
          center.y +
          (state.pinch.y - state.pinch.center.y) * ratio;

        state.scale = next;
        render();
        return;
      }

      if (state.pan?.id === event.pointerId) {
        state.x += current.x - state.pan.x;
        state.y += current.y - state.pan.y;
        state.pan.x = current.x;
        state.pan.y = current.y;
        render();
      }
    }),
    dom.on(root, "pointerup", release),
    dom.on(root, "pointercancel", release),
    dom.on(root, "lostpointercapture", release)
  ];

  image.src = source;

  try {
    return await popover({
      anchor,
      back: true,
      content: root,
      fullscreen: true,
      ready: measure
    });
  } finally {
    gesture.destroy();
    off.forEach((remove) => remove());
    cancelAnimationFrame(state.frame);
    css.remove(root);
  }
}
