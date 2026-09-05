import * as css from "#common/css";
import * as dom from "#common/dom";

export default function avatar(source = "", tag = "div") {
  const root = dom.create(tag);
  const frame = dom.create("span");
  const image = dom.create("img");

  root.className = "avatar";
  frame.className = "avatar-frame";
  image.className = "avatar-image";
  image.alt = "";
  image.draggable = false;

  if (tag === "button") {
    root.type = "button";
  }

  dom.set(root, "data-icon", "user");

  let adjustment;

  const render = () => {
    const { naturalWidth: width, naturalHeight: height } =
      image;

    if (!width || !height || !dom.get(image, "src")) {
      return;
    }

    css.set(root, {
      "--avatar-width": `${Math.max(1, width / height) * 100}%`,
      "--avatar-height": `${Math.max(1, height / width) * 100}%`,
      "--avatar-x": `${Number(adjustment?.x) * 100 || 0}%`,
      "--avatar-y": `${Number(adjustment?.y) * 100 || 0}%`,
      "--avatar-angle": `${Number(adjustment?.angle) || 0}deg`,
      "--avatar-scale":
        Number(adjustment?.previewScale) || 1
    });
    image.hidden = false;
  };

  const set = (value = "", edit = null) => {
    adjustment = edit;

    if (!value) {
      image.hidden = true;
      dom.remove(image, "src");
      dom.remove(root, "data-image");
      css.remove(root);
      return;
    }

    dom.set(root, "data-image", "");

    if (dom.get(image, "src") !== value) {
      image.hidden = true;
      image.src = value;
    } else {
      render();
    }
  };

  dom.on(image, "load", render);
  dom.on(image, "error", () => set());

  frame.append(image);
  root.append(frame);
  set(source);

  return { root, set };
}
