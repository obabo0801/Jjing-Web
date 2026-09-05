import * as css from "#common/css";
import * as dom from "#common/dom";

export default function avatar(source = "", tag = "div") {
  const root = dom.create(tag);
  const image = dom.create("img");

  root.className = "avatar";
  image.className = "avatar-image";
  image.alt = "";
  image.draggable = false;

  if (tag === "button") {
    root.type = "button";
  }

  dom.set(root, "data-icon", "user");

  const set = (value = "", edit = null) => {
    if (!value) {
      image.hidden = true;
      dom.remove(root, "data-image");
      css.remove(root);
      return;
    }

    image.src = value;
    image.hidden = false;
    dom.set(root, "data-image", "");

    css.set(root, {
      "--avatar-x": `${Number(edit?.x) * 100 || 0}%`,
      "--avatar-y": `${Number(edit?.y) * 100 || 0}%`,
      "--avatar-angle": `${Number(edit?.angle) || 0}deg`,
      "--avatar-scale": Number(edit?.previewScale) || 1
    });
  };

  dom.on(image, "error", () => set());

  root.append(image);
  set(source);

  return { root, set };
}
