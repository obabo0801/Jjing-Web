import * as css from "#common/css";
import * as dom from "#common/dom";
import device from "#common/device";
import popover from "#common/popover";
import double from "#common/image/double";

const create = (tag, name) => {
  const element = dom.create(tag);

  element.className = name;
  return element;
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const distance = ([first, second]) =>
  Math.hypot(second.x - first.x, second.y - first.y);

const midpoint = ([first, second]) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2
});

const loadImage = async (file) => {
  const image = dom.create("img");
  const url = URL.createObjectURL(file);

  image.className = "image-preview";
  image.alt = "";
  image.draggable = false;
  image.src = url;

  try {
    await image.decode();
    return {
      image,
      url,
      width: image.naturalWidth,
      height: image.naturalHeight
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
};

const loadCanvas = async (file, limit) => {
  if (typeof createImageBitmap !== "function") {
    return null;
  }

  let bitmap;

  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image"
    });

    const ratio = Math.min(
      1,
      limit / Math.max(bitmap.width, bitmap.height)
    );

    const width = Math.max(
      1,
      Math.round(bitmap.width * ratio)
    );

    const height = Math.max(
      1,
      Math.round(bitmap.height * ratio)
    );
    const image = dom.create("canvas");
    const context = image.getContext("2d");

    if (!context) {
      return null;
    }

    image.className = "image-preview";
    image.width = width;
    image.height = height;
    image.draggable = false;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    return { image, url: null, width, height };
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
};

const animated = (file) =>
  file.type?.toLowerCase() === "image/gif" ||
  /\.gif$/i.test(file.name || "");

const load = async (file, limit) =>
  animated(file)
    ? loadImage(file)
    : (await loadCanvas(file, limit)) || loadImage(file);

const createState = () => ({
  model: { angle: 0, scale: 1, x: 0, y: 0, view: null },
  gesture: {
    pointers: new Map(),
    pan: null,
    pinch: null,
    turning: null,
    skipClick: false
  },
  timer: { hold: null, cursor: null, click: null },
  raf: { draw: null, measure: null },
  layout: {
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    visualWidth: 0,
    visualHeight: 0
  }
});

export default async function edit(file, options = {}) {
  if (!(file instanceof Blob) || !file.size) {
    return null;
  }

  const width = Math.max(1, Number(options.width) || 512);
  const height = Math.max(1, Number(options.height) || 512);
  const loaded = await load(
    file,
    Math.max(width, height) * 3
  );

  if (!loaded) {
    return null;
  }

  const shape =
    options.shape === "circle" ? "circle" : "square";

  const {
    image,
    url,
    width: sourceWidth,
    height: sourceHeight
  } = loaded;
  const root = create("div", "image-editor");
  const stage = create("div", "image-stage");
  const frame = create("div", "image-frame");
  const controls = create("div", "image-controls");
  const rotate = create("button", "image-rotate");

  rotate.type = "button";

  dom.set(root, "data-drag", "none");
  dom.set(stage, "data-shape", shape);
  dom.set(rotate, "data-icon", "rotate");
  dom.set(rotate, "data-circle", "");
  dom.set(rotate, "data-background", "");
  dom.set(rotate, "data-response", "");

  frame.append(image);
  stage.append(frame);
  controls.append(rotate);
  root.append(stage, controls);

  const { model, gesture, timer, raf, layout } =
    createState();

  const metrics = () => {
    const { width: stageWidth, height: stageHeight } =
      layout;
    const radians = (model.angle * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const horizontal = Math.abs(cosine);
    const vertical = Math.abs(sine);
    const base = Math.max(
      stageWidth / sourceWidth,
      stageHeight / sourceHeight
    );

    const cover =
      shape === "circle"
        ? base
        : Math.max(
            (stageWidth * horizontal +
              stageHeight * vertical) /
              sourceWidth,
            (stageWidth * vertical +
              stageHeight * horizontal) /
              sourceHeight
          );

    return {
      width: stageWidth,
      height: stageHeight,
      base,
      cosine,
      sine,
      horizontal,
      vertical,
      cover
    };
  };

  const paint = () => {
    const {
      width: stageWidth,
      height: stageHeight,
      base,
      cosine,
      sine,
      horizontal,
      vertical,
      cover
    } = metrics();

    if (!stageWidth || !stageHeight) {
      return;
    }

    model.view = {
      width: stageWidth,
      height: stageHeight,
      cover
    };

    const zoom = cover * model.scale;
    const localX = model.x * cosine + model.y * sine;
    const localY = -model.x * sine + model.y * cosine;
    const requiredX =
      shape === "circle"
        ? stageWidth
        : stageWidth * horizontal + stageHeight * vertical;

    const requiredY =
      shape === "circle"
        ? stageHeight
        : stageWidth * vertical + stageHeight * horizontal;

    const limitX = Math.max(
      0,
      (sourceWidth * zoom - requiredX) / 2
    );

    const limitY = Math.max(
      0,
      (sourceHeight * zoom - requiredY) / 2
    );
    const nextX = clamp(localX, -limitX, limitX);
    const nextY = clamp(localY, -limitY, limitY);

    model.x = nextX * cosine - nextY * sine;
    model.y = nextX * sine + nextY * cosine;

    css.set(root, {
      "--image-width": `${sourceWidth * base}px`,
      "--image-height": `${sourceHeight * base}px`,
      "--image-scale": zoom / base,
      "--image-x": `${model.x}px`,
      "--image-y": `${model.y}px`,
      "--image-angle": `${model.angle}deg`
    });
  };

  const render = () => {
    if (raf.draw) {
      return;
    }

    raf.draw = requestAnimationFrame(() => {
      raf.draw = null;
      paint();
    });
  };

  const measure = () => {
    const rect = stage.getBoundingClientRect();
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    if (layout.width && layout.height) {
      model.x *= stageWidth / layout.width;
      model.y *= stageHeight / layout.height;
    }

    Object.assign(layout, {
      width: stageWidth,
      height: stageHeight,
      left: rect.left,
      top: rect.top,
      visualWidth: rect.width,
      visualHeight: rect.height
    });

    render();
  };

  const position = (event) => ({
    x:
      (event.clientX - layout.left) *
        (layout.width /
          (layout.visualWidth || layout.width)) -
      layout.width / 2,
    y:
      (event.clientY - layout.top) *
        (layout.height /
          (layout.visualHeight || layout.height)) -
      layout.height / 2
  });

  const zoomTo = (value, point) => {
    const next = clamp(value, 1, 3);
    const ratio = next / model.scale;

    model.x = point.x + (model.x - point.x) * ratio;
    model.y = point.y + (model.y - point.y) * ratio;
    model.scale = next;
    render();
  };

  const showZoom = (next) => {
    if (next === model.scale) {
      return false;
    }

    dom.set(
      stage,
      "data-zoom",
      next > model.scale ? "in" : "out"
    );

    clearTimeout(timer.cursor);
    timer.cursor = setTimeout(() => {
      dom.remove(stage, "data-zoom");
    }, 160);

    return true;
  };

  const tapping = double(stage, {
    scale: () => model.scale,
    point: position,
    zoom: (value, point) => {
      showZoom(value);
      zoomTo(value, point);
    }
  });

  const beginPinch = () => {
    const points = [...gesture.pointers.values()].slice(
      0,
      2
    );
    const center = midpoint(points);

    gesture.pinch = {
      distance: distance(points) || 1,
      scale: model.scale,
      x: model.x,
      y: model.y,
      center
    };
    gesture.pan = null;
    dom.remove(stage, "data-moving");
  };

  dom.on(
    stage,
    "wheel",
    (event) => {
      if (event.ctrlKey) {
        return;
      }

      event.preventDefault();

      const next = clamp(
        model.scale *
          Math.exp(
            -event.deltaY *
              (event.deltaMode === 1
                ? 0.024
                : event.deltaMode === 2
                  ? 0.25
                  : 0.0015)
          ),
        1,
        3
      );

      if (showZoom(next)) {
        zoomTo(next, position(event));
      }
    },
    { passive: false }
  );

  dom.on(stage, "pointerdown", (event) => {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    measure();

    const point = position(event);

    gesture.pointers.set(event.pointerId, point);
    stage.setPointerCapture(event.pointerId);

    if (gesture.pointers.size === 1) {
      gesture.pan = { id: event.pointerId, ...point };
      dom.set(stage, "data-moving", "");
    } else if (gesture.pointers.size === 2) {
      beginPinch();
    }
  });

  dom.on(stage, "pointermove", (event) => {
    if (!gesture.pointers.has(event.pointerId)) {
      return;
    }

    const current = position(event);

    gesture.pointers.set(event.pointerId, current);

    if (gesture.pointers.size >= 2 && gesture.pinch) {
      const points = [...gesture.pointers.values()].slice(
        0,
        2
      );
      const center = midpoint(points);

      const next = clamp(
        gesture.pinch.scale *
          (distance(points) / gesture.pinch.distance),
        1,
        3
      );
      const ratio = next / gesture.pinch.scale;

      showZoom(next);
      model.x =
        center.x +
        (gesture.pinch.x - gesture.pinch.center.x) * ratio;

      model.y =
        center.y +
        (gesture.pinch.y - gesture.pinch.center.y) * ratio;

      model.scale = next;
      render();
      return;
    }

    if (gesture.pan?.id === event.pointerId) {
      model.x += current.x - gesture.pan.x;
      model.y += current.y - gesture.pan.y;
      gesture.pan.x = current.x;
      gesture.pan.y = current.y;
      render();
    }
  });

  const releasePointer = (event) => {
    if (!gesture.pointers.has(event.pointerId)) {
      return;
    }

    gesture.pointers.delete(event.pointerId);
    gesture.pinch = null;
    dom.remove(stage, "data-zoom");

    if (gesture.pointers.size === 1) {
      const [id, point] = gesture.pointers
        .entries()
        .next().value;

      gesture.pan = { id, ...point };
      dom.set(stage, "data-moving", "");
    } else {
      gesture.pan = null;
      dom.remove(stage, "data-moving");
    }
  };

  dom.on(stage, "pointerup", releasePointer);
  dom.on(stage, "pointercancel", releasePointer);
  dom.on(stage, "lostpointercapture", releasePointer);

  const pointerAngle = (point) => {
    return (Math.atan2(point.y, point.x) * 180) / Math.PI;
  };

  const rotateBy = (difference) => {
    tapping.cancel();
    const radians = (difference * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const nextX = model.x * cosine - model.y * sine;
    const nextY = model.x * sine + model.y * cosine;

    model.x = nextX;
    model.y = nextY;
    model.angle += difference;
    render();
  };

  dom.on(rotate, "pointerdown", (event) => {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    tapping.cancel();
    measure();

    const point = position(event);

    gesture.turning = {
      id: event.pointerId,
      point,
      pointer: pointerAngle(point),
      active: false
    };
    rotate.setPointerCapture(event.pointerId);

    timer.hold = setTimeout(() => {
      if (!gesture.turning) {
        return;
      }

      gesture.turning.active = true;
      gesture.turning.pointer = pointerAngle(
        gesture.turning.point
      );

      dom.set(root, "data-rotating", "");
    }, 350);
  });

  dom.on(rotate, "pointermove", (event) => {
    if (gesture.turning?.id !== event.pointerId) {
      return;
    }

    gesture.turning.point = position(event);

    if (!gesture.turning.active) {
      return;
    }

    const next = pointerAngle(gesture.turning.point);
    const difference =
      ((next - gesture.turning.pointer + 540) % 360) - 180;

    rotateBy(difference);
    gesture.turning.pointer = next;
  });

  const releaseRotation = (event) => {
    if (gesture.turning?.id !== event.pointerId) {
      return;
    }

    clearTimeout(timer.hold);
    gesture.skipClick = gesture.turning.active;

    clearTimeout(timer.click);

    if (gesture.skipClick) {
      timer.click = setTimeout(() => {
        gesture.skipClick = false;
      });
    }

    gesture.turning = null;
    model.angle = ((model.angle % 360) + 360) % 360;
    dom.remove(root, "data-rotating");
  };

  dom.on(rotate, "pointerup", releaseRotation);
  dom.on(rotate, "pointercancel", releaseRotation);
  dom.on(rotate, "lostpointercapture", releaseRotation);
  dom.on(rotate, "contextmenu", (event) => {
    event.preventDefault();
  });

  dom.on(rotate, "click", (event) => {
    if (gesture.skipClick) {
      gesture.skipClick = false;
      event.preventDefault();
      return;
    }

    rotateBy(90);
    model.angle %= 360;
  });

  const resize = () => {
    if (raf.measure) {
      return;
    }

    raf.measure = requestAnimationFrame(() => {
      raf.measure = null;
      measure();
    });
  };

  const removeResize = [dom.on(window, "resize", resize)];

  let confirmed;

  try {
    confirmed = await popover({
      anchor: options.anchor,
      back: true,
      title: options.title || "image.title",
      content: root,
      ready: () => {
        measure();

        if (options.edit) {
          const number = (value, fallback = 0) =>
            Number.isFinite(Number(value))
              ? Number(value)
              : fallback;

          Object.assign(model, {
            angle: number(options.edit.angle) % 360,
            scale: clamp(
              number(options.edit.scale, 1),
              1,
              3
            ),
            x: number(options.edit.x) * layout.width,
            y: number(options.edit.y) * layout.height
          });
          paint();
        }
      },
      actions: [
        {
          text: "image.reset",
          close: false,
          run: () => {
            tapping.cancel();
            Object.assign(model, {
              angle: 0,
              scale: 1,
              x: 0,
              y: 0
            });
            render();
          },
          data: ["data-neutral"]
        },
        {
          text: "image.confirm",
          value: true,
          run: () => tapping.cancel(),
          data: ["data-confirm"]
        }
      ],
      fullscreen: !device().window
    });
  } catch (error) {
    if (url) {
      URL.revokeObjectURL(url);
    }

    css.remove(root);
    throw error;
  } finally {
    removeResize.forEach((remove) => remove());
    tapping.destroy();
    clearTimeout(timer.hold);
    clearTimeout(timer.cursor);
    clearTimeout(timer.click);
    cancelAnimationFrame(raf.measure);
    cancelAnimationFrame(raf.draw);
    raf.measure = null;
    raf.draw = null;
  }

  if (confirmed) {
    paint();
  }

  let result = null;

  if (confirmed && model.view) {
    const base = Math.max(
      model.view.width / sourceWidth,
      model.view.height / sourceHeight
    );

    result = {
      file,
      edit: {
        width,
        height,
        shape,
        angle: model.angle,
        scale: model.scale,
        x: model.x / model.view.width,
        y: model.y / model.view.height,
        previewScale: base
          ? (model.view.cover * model.scale) / base
          : model.scale
      }
    };
  }

  if (url) {
    URL.revokeObjectURL(url);
  }

  css.remove(root);
  return result;
}
