import * as css from "#common/css";
import * as dom from "#common/dom";
import popover from "#common/popover";
import double from "#common/image/double";
import * as theme from "#common/theme";
import * as route from "#common/route";
import * as images from "#shared/image";
import * as giphy from "#common/giphy";

route.register("image", async (id) => {
  const source = id.startsWith("giphy-")
    ? await giphy.resolve(id.slice(6))
    : images.source(id);

  return source ? view(source, undefined, "", id) : false;
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const distance = ([first, second]) =>
  Math.hypot(second.x - first.x, second.y - first.y);

const midpoint = ([first, second]) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2
});

export default async function view(
  source,
  anchor,
  icon = "",
  id = images.identify(source, location.origin)
) {
  if (!source && !icon) {
    return false;
  }

  const root = dom.create("div");
  const stage = dom.create("div");
  const empty = dom.create("span");
  const image = dom.create("img");
  const full = dom.create("button");
  const back = dom.create("button");

  root.className = "image-view";
  stage.className = "image-view-stage";
  empty.className = "image-view-empty";
  image.className = "image-view-media";
  full.type = "button";
  full.className = "image-view-full";
  back.type = "button";
  back.className = "image-view-back";

  empty.classList.add("image-view-media");

  if (icon) {
    dom.set(empty, "data-icon", icon);
  }

  image.alt = "";
  image.draggable = false;

  dom.set(root, "data-drag", "none");

  dom.set(full, "data-icon", "full");
  dom.set(full, "data-circle", "");
  dom.set(full, "data-background", "");
  dom.set(full, "data-response", "");

  dom.set(back, "data-icon", "arrow");
  dom.set(back, "data-angle", "left");
  dom.set(back, "data-circle", "");
  dom.set(back, "data-background", "");
  dom.set(back, "data-response", "");

  stage.append(empty, image);
  root.append(stage, full, back);

  const state = {
    scale: 1,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    pointers: new Map(),
    pan: null,
    pinch: null,
    frame: null,
    close: null,
    closing: false,
    screening: false
  };

  const controls = (visible) => {
    back.hidden = !visible || state.closing;
    full.hidden =
      back.hidden || !document.fullscreenEnabled || !root.requestFullscreen;
  };

  const paint = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const imageWidth = image.naturalWidth || width;
    const imageHeight = image.naturalHeight || height;
    const fit = Math.min(width / imageWidth, height / imageHeight);

    const limitX = Math.max(
      0,
      (imageWidth * fit * state.scale - root.clientWidth) / 2
    );

    const limitY = Math.max(
      0,
      (imageHeight * fit * state.scale - root.clientHeight) / 2
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
        (event.clientX - rect.left) * (root.clientWidth / rect.width) -
        root.clientWidth / 2,
      y:
        (event.clientY - rect.top) * (root.clientHeight / rect.height) -
        root.clientHeight / 2
    };
  };

  const zoom = (value, center) => {
    const next = clamp(value, 1, 4);
    const ratio = next / state.scale;

    state.x = center.x + (state.x - center.x) * ratio;
    state.y = center.y + (state.y - center.y) * ratio;
    state.scale = next;

    if (state.pan) {
      state.pan.start = null;
      state.pan.press = null;
    }

    controls(next <= 1.01);
    render();
  };

  const gesture = double(root, { scale: () => state.scale, point, zoom });

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
    controls(false);
    dom.remove(root, "data-moving");
  };

  const dismiss = async () => {
    if (state.closing || state.screening || !state.close) {
      return;
    }

    state.closing = true;
    controls(false);

    try {
      if (document.fullscreenElement === root) {
        await document.exitFullscreen();
      }

      await state.close(false);
    } finally {
      state.closing = false;
    }
  };

  const release = (event) => {
    if (!state.pointers.has(event.pointerId)) {
      return;
    }

    const pan = state.pan?.id === event.pointerId ? state.pan : null;
    const start = pan?.start;
    const press = pan?.press;
    const tapped =
      event.type === "pointerup" &&
      !event.defaultPrevented &&
      press &&
      event.timeStamp - press.time <= 300 &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8;

    if (event.type === "pointerup" && start && state.scale <= 1.01) {
      const current = point(event);
      const x = start.x - current.x;
      const y = Math.abs(start.y - current.y);
      const minimum = Math.max(24, Math.min(80, root.clientWidth * 0.2));

      if (x >= minimum && x > y * 1.5) {
        dismiss().catch(() => {});
      }
    }

    state.pointers.delete(event.pointerId);
    state.pinch = null;

    if (state.pointers.size === 1) {
      const [id, current] = state.pointers.entries().next().value;

      state.pan = { id, ...current };
      dom.set(root, "data-moving", "");
    } else {
      state.pan = null;
      dom.remove(root, "data-moving");
      controls(
        !event.defaultPrevented && (tapped ? press.hidden : state.scale <= 1.01)
      );
    }
  };

  const screen = async () => {
    if (
      !root.requestFullscreen ||
      (document.fullscreenElement && document.fullscreenElement !== root) ||
      state.screening ||
      state.closing
    ) {
      return;
    }

    state.screening = true;

    try {
      if (document.fullscreenElement === root) {
        await document.exitFullscreen();
      } else {
        await root.requestFullscreen();
      }
    } finally {
      state.screening = false;
    }
  };

  const screenState = () => {
    const active = document.fullscreenElement === root;

    dom.set(full, "data-icon", active ? "full-exit" : "full");
    controls(!active && state.scale <= 1.01);

    measure();
  };

  const off = [
    dom.on(image, "load", render),
    dom.on(window, "resize", measure),
    dom.on(full, "click", () => {
      screen().catch(() => {});
    }),
    dom.on(back, "click", () => {
      dismiss().catch(() => {});
    }),
    dom.on(document, "fullscreenchange", screenState),
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
      if (event.target.closest?.("button")) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const current = point(event);
      const hidden = back.hidden;

      controls(false);
      state.pointers.set(event.pointerId, current);
      root.setPointerCapture(event.pointerId);

      if (state.pointers.size === 1) {
        state.pan = {
          id: event.pointerId,
          ...current,
          start: state.scale <= 1.01 ? current : null,
          press: {
            x: event.clientX,
            y: event.clientY,
            time: event.timeStamp,
            hidden
          }
        };
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
        const points = [...state.pointers.values()].slice(0, 2);

        const center = midpoint(points);
        const next = clamp(
          state.pinch.scale * (distance(points) / state.pinch.distance),
          1,
          4
        );
        const ratio = next / state.pinch.scale;

        state.x = center.x + (state.pinch.x - state.pinch.center.x) * ratio;

        state.y = center.y + (state.pinch.y - state.pinch.center.y) * ratio;

        state.scale = next;
        controls(false);
        render();
        return;
      }

      if (state.pan?.id === event.pointerId) {
        const press = state.pan.press;

        if (
          press &&
          Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8
        ) {
          state.pan.press = null;
        }

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

  if (source) {
    empty.hidden = true;
    image.src = source;
  } else {
    image.hidden = true;
  }

  let restore;

  try {
    return await popover({
      route: id ? ["image", id] : undefined,
      anchor,
      content: root,
      fullscreen: true,
      ready: (element, close) => {
        state.close = close;
        restore = theme.color(root);
        screenState();
      }
    });
  } finally {
    restore?.();
    gesture.destroy();
    off.forEach((remove) => remove());
    cancelAnimationFrame(state.frame);
    css.remove(root);
  }
}
