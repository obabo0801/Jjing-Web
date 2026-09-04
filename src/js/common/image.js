import * as dom from "#common/dom";
import device from "#common/device";
import { preload } from "#common/i18n";
import popover from "#common/popover";

preload(
  "image.title",
  "image.zoom",
  "image.rotate",
  "image.cancel",
  "image.confirm"
);

const create = (tag, name) => {
  const element = dom.create(tag);

  element.className = name;
  return element;
};

const load = async (file) => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image"
      });
    } catch {}
  }

  const image = new Image();
  const url = URL.createObjectURL(file);

  try {
    image.src = url;
    await image.decode();

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const blob = (canvas, type, quality) =>
  new Promise((resolve) =>
    canvas.toBlob(resolve, type, quality)
  );

const slider = () => {
  const label = create("label", "image-zoom");
  const text = create("span", "image-zoom-label");
  const range = create("span", "range");
  const track = create("span", "range-track");
  const fill = create("span", "range-fill");
  const thumb = create("span", "range-thumb");
  const input = dom.create("input");

  text.textContent = "image.zoom";
  input.type = "range";
  input.name = "image-zoom";
  input.min = "100";
  input.max = "300";
  input.value = "100";

  dom.set(text, "data-i18n", "image.zoom");
  track.append(fill);
  range.append(track, thumb, input);
  label.append(text, range);

  return { label, input };
};

export default async function edit(file, options = {}) {
  if (!(file instanceof Blob) || !file.size) {
    return null;
  }

  const width = Math.max(1, Number(options.width) || 512);
  const height = Math.max(1, Number(options.height) || 512);
  const quality = Number(options.quality) || 0.9;
  const shape =
    options.shape === "circle" ? "circle" : "square";
  const source = await load(file);
  const root = create("div", "image-editor");
  const stage = create("div", "image-stage");
  const canvas = dom.create("canvas");
  const controls = create("div", "image-controls");
  const rotate = dom.create("button");
  const { label: zoom, input } = slider();

  canvas.width = width;
  canvas.height = height;
  rotate.type = "button";
  rotate.textContent = "image.rotate";

  dom.set(stage, "data-shape", shape);
  dom.set(rotate, "data-icon", "reload");
  dom.set(rotate, "data-i18n", "image.rotate");
  dom.set(rotate, "data-background", "");
  dom.set(rotate, "data-response", "");

  stage.append(canvas);
  controls.append(zoom, rotate);
  root.append(stage, controls);

  const context = canvas.getContext("2d");
  const sourceWidth = source.naturalWidth || source.width;
  const sourceHeight =
    source.naturalHeight || source.height;

  let angle = 0;
  let scale = 1;
  let x = 0;
  let y = 0;
  let pointer;

  const size = () => {
    const turned = Math.abs(angle % 180) === 90;

    return {
      width: turned ? sourceHeight : sourceWidth,
      height: turned ? sourceWidth : sourceHeight
    };
  };

  const draw = () => {
    const rotated = size();
    const base = Math.max(
      width / rotated.width,
      height / rotated.height
    );
    const zoom = base * scale;
    const boundX = Math.max(
      0,
      (rotated.width * zoom - width) / 2
    );

    const boundY = Math.max(
      0,
      (rotated.height * zoom - height) / 2
    );

    x = Math.min(boundX, Math.max(-boundX, x));
    y = Math.min(boundY, Math.max(-boundY, y));

    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width / 2 + x, height / 2 + y);
    context.rotate((angle * Math.PI) / 180);
    context.scale(zoom, zoom);
    context.drawImage(
      source,
      -sourceWidth / 2,
      -sourceHeight / 2
    );
    context.restore();
  };

  dom.on(input, "input", () => {
    scale = Number(input.value) / 100;
    draw();
  });

  dom.on(rotate, "click", () => {
    angle = (angle + 90) % 360;
    x = 0;
    y = 0;
    draw();
  });

  dom.on(canvas, "pointerdown", (event) => {
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };
    canvas.setPointerCapture(event.pointerId);
  });

  dom.on(canvas, "pointermove", (event) => {
    if (!pointer || pointer.id !== event.pointerId) {
      return;
    }

    const rect = canvas.getBoundingClientRect();

    x += ((event.clientX - pointer.x) * width) / rect.width;
    y +=
      ((event.clientY - pointer.y) * height) / rect.height;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    draw();
  });

  const release = (event) => {
    if (pointer?.id !== event.pointerId) {
      return;
    }

    pointer = undefined;
  };

  dom.on(canvas, "pointerup", release);
  dom.on(canvas, "pointercancel", release);
  dom.on(canvas, "lostpointercapture", release);
  draw();

  const confirmed = await popover({
    anchor: options.anchor,
    title: options.title || "image.title",
    content: root,
    actions: [
      {
        text: "image.cancel",
        value: false,
        data: ["data-neutral"]
      },
      {
        text: "image.confirm",
        value: true,
        data: ["data-confirm"]
      }
    ],
    fullscreen: !device().window
  });

  const result = confirmed
    ? await blob(
        canvas,
        options.type || "image/webp",
        quality
      )
    : null;

  source.close?.();
  return result;
}
