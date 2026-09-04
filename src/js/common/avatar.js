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

  const set = (value = "") => {
    if (!value) {
      image.hidden = true;
      dom.remove(root, "data-image");
      return;
    }

    image.src = value;
    image.hidden = false;
    dom.set(root, "data-image", "");
  };

  dom.on(image, "error", () => set());

  root.append(image);
  set(source);

  return { root, set };
}
