import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as rules from "#shared/attach";
import view from "#common/image/view";
import * as assets from "#common/chatting/asset";
import load from "#common/image/load";
import * as rendition from "#shared/rendition";
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

  const pictures = [];
  const collection = () =>
    pictures
      .filter(({ button }) => {
        const image = button.querySelector("img:not(.image-load-preview)");

        return !button.hasAttribute("data-spoiler") && image?.src && !image.hidden;
      })
      .map(({ button, url, route, resolve }) => {
        const image = button.querySelector("img:not(.image-load-preview)");

        return {
          url: url || image.src,
          preview: image.src,
          name: image.alt,
          route,
          resolve,
          sender: options,
          time: options.time,
          message: target.closest(".chatting-message")
        };
      });

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
      pictures.push({ button, route: `giphy-${item.id}`, resolve: () => giphy.resolve(item.id) });

      dom.on(button, "click", () => {
        const image = button.querySelector("img:not(.image-load-preview)");

        if (image?.src && !image.hidden)
          view(image.src, button, "", `giphy-${item.id}`, collection());
      });

      assets.bind(
        button,
        () => {
          const image = button.querySelector("img:not(.image-load-preview)");

          return (
            image?.src && {
              kind: "image",
              sender: options,
              time: options.time,
              url: image.src,
              preview: image.src,
              name: image.alt,
              resolve: () => giphy.resolve(item.id),
              open: () => view(image.src, button, "", `giphy-${item.id}`, collection())
            }
          );
        },
        false
      );

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

    // 움직일 수 있는 GIF/WebP는 기존 채팅 preview를 유지합니다.
    const still = !sticker && /\.(jpg|png)(?:[?#]|$)/i.test(source);
    const preview =
      (still && rendition.source(source, 640, location.origin)) ||
      (sticker ? source : item.preview || source);

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
    load(image, {
      target: button,
      source: preview,
      preview: options.previews?.[items.indexOf(item)],
      shown: Boolean(options.previews),
      lazy: !options.previews
    });

    pictures.push({ button, url: source });
    dom.on(button, "click", () => {
      if (button.hasAttribute("data-spoiler")) {
        dom.remove(button, "data-spoiler");
        button.querySelector(".chatting-spoiler")?.remove();
        image.alt = item.description;
      } else view(source, button, "", undefined, collection());
    });

    assets.bind(
      button,
      () => ({
        kind: "image",
        sender: options,
        time: options.time,
        url: source,
        preview,
        name: image.alt,
        open: () => view(source, button, "", undefined, collection())
      }),
      false
    );

    content.append(button);
  }

  if (grouped) {
    target.append(content);
  }
}
