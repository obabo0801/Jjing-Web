import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import popover from "#common/popover";
import progress from "#common/progress";
import toast from "#common/toast";
import maximum from "#shared/upload";

i18n.preload(
  "image.sizeError",
  "image.loadError",
  "image.uploadError",
  "image.cancel",
  "chatting.tools.preview",
  "chatting.send"
);

export const preview = async (file, anchor, send) => {
  if (!file?.size) return;
  if (file.size > maximum) {
    toast({ text: "image.sizeError", type: "error" });
    return;
  }
  const url = URL.createObjectURL(file);
  const root = dom.create("div");
  const image = dom.create("img");

  let active = true;

  root.className = "chatting-preview-image";
  image.src = url;
  image.alt = i18n.message("chatting.tools.image");
  image.draggable = false;
  root.append(image);
  try {
    await image.decode();
    await popover({
      anchor,
      back: true,
      title: "chatting.tools.preview",
      content: root,
      direction: "→",
      actions: [
        { text: "image.cancel", icon: "close", value: false },
        {
          text: "chatting.send",
          icon: "send",
          data: ["data-confirm"],
          run: async ({ button }) => {
            const loading = progress({
              target: root,
              type: "circular",
              value: 25,
              show: false
            });

            button.disabled = true;
            try {
              const saved = await send(file);

              return active && saved;
            } catch {
              if (active) toast({ text: "image.uploadError", type: "error" });
              return false;
            } finally {
              loading.destroy();
              button.disabled = false;
            }
          }
        }
      ]
    });
  } catch {
    toast({ text: "image.loadError", type: "error" });
  } finally {
    active = false;
    URL.revokeObjectURL(url);
  }
};

export default async function image(anchor, send) {
  const input = dom.create("input");

  input.type = "file";
  input.multiple = true;
  input.accept = "image/jpeg,image/png,image/webp,image/gif";
  input.hidden = true;
  dom.body.append(input);
  try {
    const files = await new Promise((resolve) => {
      dom.on(input, "change", () => resolve([...input.files]), { once: true });
      dom.on(input, "cancel", () => resolve([]), { once: true });
      input.click();
    });

    for (const file of files) {
      if (!(await send(file))) break;
    }
  } finally {
    input.remove();
  }
}
