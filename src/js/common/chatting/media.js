import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as rules from "#shared/attachment";
import view from "#common/image/view";
import * as giphy from "#common/giphy";

i18n.preload("chatting.attach.reveal");

export default function media(target, options) {
  const items = options.attachments?.length
    ? options.attachments
    : options.image
      ? [
          {
            type: "image",
            image: options.image,
            preview: options.preview || options.image,
            description: "",
            spoiler: false
          }
        ]
      : [];

  if (!rules.valid(items)) return;

  const grouped = items.length > 1;
  const content = grouped ? dom.create("div") : target;

  if (grouped) {
    content.className = "chatting-image-group";
  }

  for (const item of items) {
    if (item.provider === "giphy") {
      const button = dom.create("button");

      button.type = "button";
      button.className = "chatting-image";
      dom.set(button, "data-response", "");
      dom.set(button, "data-giphy", item.type);
      giphy.image(button, item);
      dom.on(button, "click", () => {
        const image = button.querySelector("img");

        if (image?.src && !image.hidden) view(image.src, button, "", `giphy-${item.id}`);
      });
      content.append(button);
      continue;
    }

    const button = dom.create("button");
    const image = dom.create("img");
    const sticker = item.type === "ogq";
    const source = sticker ? rules.source(item) : item.image;

    button.type = "button";
    button.className = "chatting-image";
    dom.set(button, "data-response", "");

    image.src = sticker ? source : item.preview;

    image.alt = sticker ? "OGQ" : item.description;
    image.draggable = false;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    if (sticker) dom.set(button, "data-ogq", "");
    if (item.spoiler) {
      dom.set(button, "data-spoiler", "");

      const hint = dom.create("span");

      hint.className = "chatting-spoiler";
      hint.textContent = i18n.message("chatting.attach.reveal");
      dom.set(hint, "data-i18n", "chatting.attach.reveal");
      button.append(hint);
      // 숨긴 이미지 설명도 공개 전에는 읽히지 않게 합니다.
      image.alt = "";
    }

    button.append(image);
    dom.on(button, "click", () => {
      if (button.hasAttribute("data-spoiler")) {
        dom.remove(button, "data-spoiler");
        button.querySelector(".chatting-spoiler")?.remove();
        image.alt = item.description;
      } else view(source, button);
    });
    content.append(button);
  }

  if (grouped) {
    target.append(content);
  }
}
