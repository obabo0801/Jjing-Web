import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import toolbar from "#common/toolbar";
import { atBottom } from "#common/chatting";
import emoji from "#common/chatting/emoji";
import image from "#common/chatting/image";
import draw from "#common/chatting/draw";
import stt from "#common/chatting/stt";
import tts from "#common/chatting/tts";

i18n.preload(
  "chatting.tools.open",
  "chatting.tools.emoji",
  "chatting.tools.image",
  "chatting.tools.draw",
  "chatting.tools.stt",
  "chatting.tools.tts",
  "chatting.tools.unavailable",
  "image.reset",
  "image.confirm"
);

export default function tools(root, history) {
  const form = dom.query(".chatting-form", root);
  const input = dom.query(".chatting-input", form);
  const list = dom.query(".chatting-list", root);
  const field = input.closest(".input");
  const toggle = dom.create("button");
  const entries = [
    ["smile", "emoji", () => emoji(input, history.attach)],
    ["image", "image", (button) => image(button, history.image)],
    ["edit", "draw", (button) => draw(button, history.image)],
    ["voice", "stt", (button) => stt(button, input, history.audio)],
    ["sound", "tts", (button) => tts(button, input, history.audio)]
  ];

  const menu = toolbar(
    entries.map(([icon, name, run]) => ({
      icon,
      text: `chatting.tools.${name}`,
      run
    }))
  );

  toggle.className = "chatting-more";
  toggle.type = "button";
  dom.set(toggle, "data-icon", "plus");
  dom.set(toggle, "data-circle", "");
  dom.set(toggle, "data-tooltip", "chatting.tools.open");
  menu.classList.add("chatting-toolbar");
  dom.set(menu, "data-position", "bottom");
  entries.forEach(([, name], index) => {
    dom.set(menu.children[index], "data-circle", "");
    dom.set(menu.children[index], "data-tooltip", `chatting.tools.${name}`);
  });
  dom.query(".input-actions", field).prepend(toggle);

  const attached = dom.query(".chatting-attachments", form);

  if (attached) {
    attached.after(menu);
  } else {
    field.before(menu);
  }
  const off = dom.on(toggle, "click", () => {
    if (root.hasAttribute("data-emotes")) {
      form.dispatchEvent(new Event("chatting-emotes-close"));
      return;
    }
    const opened = dom.get(form, "data-expanded") === "true";
    const stick = atBottom(list);

    dom.set(form, "data-expanded", String(!opened));
    dom.set(toggle, "data-icon", opened ? "plus" : "close");
    if (stick) list.scrollTop = list.scrollHeight;
  });

  const update = () => {
    toggle.disabled = input.disabled;
    for (const button of menu.children) {
      button.disabled = input.disabled || input.readOnly;
    }
  };
  const observer = new MutationObserver(update);

  observer.observe(input, {
    attributes: true,
    attributeFilter: ["disabled", "readonly"]
  });

  const preserve = dom.on(menu, "pointerdown", (event) => {
    if (event.target.closest("button")) event.preventDefault();
  });

  update();
  return () => {
    preserve();
    off();
    observer.disconnect();
    toggle.remove();
    menu.remove();
  };
}
