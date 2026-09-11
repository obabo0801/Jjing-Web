import * as dom from "#common/dom";
import * as input from "#common/input";
import * as emoji from "#common/emoji";
import * as i18n from "#common/i18n";
import { enter } from "#common/chatting/input";
import sheet from "#common/sheet";
import toast from "#common/toast";
import progress from "#common/progress";
import swipe from "#common/swipe";
import api from "#common/api";
import * as route from "#shared/route";
import * as attachment from "#shared/attachment";

i18n.preload(
  "chatting.emoji.basic",
  "chatting.emoji.unavailable",
  "chatting.emoji.clear",
  "chatting.emoji.recent",
  "chatting.emoji.ogq",
  "chatting.send"
);

const emojis = [
  "😀",
  "😄",
  "😆",
  "😅",
  "😂",
  "🙂",
  "😉",
  "😊",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "😴",
  "😭",
  "😡",
  "🥳",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "❤️",
  "✨",
  "🎉"
];

const state = { index: 0, kind: "emoji" };

export default function select(field, anchor, attach) {
  const root = dom.create("div");
  const tabs = dom.create("div");
  const kinds = dom.create("div");
  const grid = dom.create("div");
  const head = dom.create("div");
  const preview = dom.create("div");
  const actions = dom.create("div");
  const send = dom.create("button");
  const submit = dom.query(".chatting-send", field.form);
  const value = field.nextElementSibling?.matches(".chatting-editor")
    ? field.nextElementSibling
    : field;
  const clear = dom.query(".chatting-clear", field.form);
  const home = clear?.parentElement;
  const slot = document.createComment("");
  const attached = dom.query(".chatting-attachments", field.form);
  const attachmentSlot = document.createComment("");
  const hint = value.getAttribute("enterkeyhint");
  const loading = progress({ type: "circular", value: 25, show: false });
  const groups = [];
  const recent = [];
  const basic = [
    { title: "chatting.emoji.basic", icon: "smile", items: emojis }
  ];
  const off = [];

  let closed = false;
  let index = state.index;
  let kind = state.kind;
  let closing;
  let submitted = false;
  let gesture;
  let animation;

  root.className = "chatting-emotes";
  tabs.className = "segment";
  kinds.className = "segment chatting-emote-kinds";
  grid.className = "group chatting-emojis";
  head.className = "chatting-emote-head";
  preview.className = "input chatting-preview-emoji";
  actions.className = "input-actions";
  dom.set(preview, "data-drag", "none");
  dom.set(grid, "data-view", "grid");
  send.type = "button";
  dom.set(send, "data-icon", "send");
  dom.set(send, "data-circle", "");
  dom.set(send, "data-response", "");
  dom.set(send, "data-confirm", "");
  dom.set(send, "data-tooltip", "chatting.send");
  actions.append(send);
  preview.append(actions);
  head.append(preview, tabs, kinds);
  root.append(head, loading.element, grid);

  const update = () => {
    send.hidden =
      !field.value.trim() && !Number(dom.get(field.form, "data-attachments"));

    send.disabled =
      field.disabled || field.readOnly || Boolean(submit?.disabled);
  };

  const observer = new MutationObserver(update);

  observer.observe(field, {
    attributes: true,
    attributeFilter: ["disabled", "readonly"]
  });
  if (submit) observer.observe(submit, { attributes: true });
  off.push(dom.on(field, "input", update));
  off.push(dom.on(field.form, "chatting-attachments", update));
  off.push(dom.on(field.form, "reset", () => queueMicrotask(update)));
  const submitMessage = () => {
    update();

    if (send.hidden || send.disabled) {
      return;
    }

    submitted = true;
    field.form.requestSubmit(submit);
  };

  off.push(
    dom.on(field.form, "chatting-sent", () => {
      if (submitted) closing?.(true);
    })
  );

  dom.on(send, "click", submitMessage);

  update();

  const display = (items, target = grid) => {
    target.replaceChildren();
    for (const item of items) {
      const row = dom.create("div");
      const button = dom.create("button");
      const sticker = item.type === "ogq";
      const value =
        typeof item === "string" ? item : item.value || item.keyword;
      const entry = emoji.get(value);

      row.className = "group-item";
      button.className = "icon-center";
      button.type = "button";
      if (sticker) {
        const image = dom.create("img");

        dom.set(row, "data-ogq", "");

        image.className = "chatting-emoji";
        image.src = attachment.source(item);
        image.alt = "OGQ";
        image.width = image.height = 160;
        image.loading = "lazy";
        image.draggable = false;
        image.referrerPolicy = "no-referrer";
        button.append(image);
      } else if (entry || item.src)
        button.append(emoji.image(entry || item, true));
      else button.textContent = value;
      dom.set(button, "data-response", "");
      if (!sticker) dom.set(button, "data-tooltip", value);
      dom.on(button, "click", () => {
        if (sticker) {
          if (!field.disabled && !field.readOnly) attach?.(item);
          return;
        }
        if (!input.insert(field, value, false) && !field.disabled)
          toast({ text: "chatting.tooLong", type: "warning" });
      });
      row.append(button);
      target.append(row);
    }
  };

  const render = () => {
    kinds.hidden = index !== 0;
    display(
      index ? groups[index].items : recent.filter((item) => item.type === kind)
    );
  };

  for (const [type, key] of [
    ["emoji", "basic"],
    ["ogq", "ogq"]
  ]) {
    const button = dom.create("button");

    button.type = "button";
    dom.set(button, "data-i18n", `chatting.emoji.${key}`);
    button.textContent = i18n.message(`chatting.emoji.${key}`);
    dom.on(button, "click", () => {
      if (button.disabled) return;
      kind = type;
      state.kind = type;
      [...kinds.children].forEach((item) =>
        item.toggleAttribute("data-selected", item === button)
      );
      render();
    });
    kinds.append(button);
  }

  const animate = (frames, dragging = false) => {
    animation?.cancel();
    animation = grid.animate(frames, {
      duration: dragging
        ? 1000
        : matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 160,
      easing: dragging ? "linear" : "ease-out",
      fill: dragging ? "both" : "none"
    });
  };

  const select = (next, direction = -Math.sign(next - index)) => {
    index = next;
    state.index = next;

    [...tabs.children].forEach((button, at) => {
      button.toggleAttribute("data-selected", at === index);
    });

    tabs.children[index].scrollIntoView({
      block: "nearest",
      inline: "nearest"
    });
    render();
    animate([
      { transform: `translateX(${-direction * 24}px)`, opacity: 0.4 },
      { transform: "translateX(0)", opacity: 1 }
    ]);
  };

  const tab = (group, selected = false) => {
    const button = dom.create("button");
    const at = groups.push(group) - 1;

    button.type = "button";
    button.disabled = !group.items?.length;
    dom.set(button, "data-icon", group.icon);
    dom.set(button, "data-default", "smile");
    dom.set(button, "data-tooltip", group.title);
    if (selected) dom.set(button, "data-selected", "");
    dom.on(button, "click", () => {
      if (at === index || gesture) return;
      select(at);
    });
    tabs.append(button);
  };

  const show = (packs = [], loaded = false) => {
    if (loaded) {
      index = state.index;
      kind = state.kind;
    }

    groups.length = 0;
    tabs.replaceChildren();
    tab({ title: "chatting.emoji.recent", icon: "clock", items: recent }, true);
    [...basic, ...packs].forEach((group) => tab(group));
    if (!recent.some((item) => item.type === kind)) {
      kind = recent[0]?.type || "emoji";

      if (loaded) {
        state.kind = kind;
      }
    }
    [...kinds.children].forEach((button, at) => {
      const type = at ? "ogq" : "emoji";

      button.disabled = !recent.some((item) => item.type === type);
      button.toggleAttribute(
        "data-selected",
        !button.disabled && kind === type
      );
    });
    if (!groups[index]?.items?.length) {
      index = groups.findIndex((group) => group.items?.length);

      if (loaded) {
        state.index = index;
      }
    }

    [...tabs.children].forEach((button, at) =>
      button.toggleAttribute("data-selected", at === index)
    );
    render();
  };

  show();

  const adjacent = (step) => {
    for (let at = index + step; at >= 0 && at < groups.length; at += step)
      if (groups[at].items?.length) return at;
    return -1;
  };

  return sheet({
    anchor,
    exit: "fade",
    title: "chatting.tools.emoji",
    stage: "full",
    content: root,
    direction: "→",
    ready: (element, close) => {
      closing = close;
      const stuck = () => {
        head.toggleAttribute("data-stuck", element.scrollTop > 0);
      };

      off.push(dom.on(element, "scroll", stuck));
      stuck();

      value.before(slot);
      preview.prepend(value);

      if (clear) {
        actions.prepend(clear);
      }
      if (attached) {
        attached.before(attachmentSlot);
        preview.before(attached);
      }
      dom.set(value, "enterkeyhint", "enter");
      off.push(
        dom.on(
          value,
          "keydown",
          (event) => {
            if (!enter(event)) {
              return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            if (dom.has("wearable")) {
              return;
            }

            submitMessage();
          },
          true
        )
      );
      for (const [direction, step] of [
        ["←", 1],
        ["→", -1]
      ]) {
        off.push(
          swipe(direction, {
            target: element,
            ignore: ".segment, .chatting-preview-emoji, .chatting-attachments",
            scroll: true,
            accept: () =>
              !gesture &&
              !element.hasAttribute("data-swipe") &&
              adjacent(step) !== -1,
            start: () => {
              gesture = { index: adjacent(step), step };
              dom.set(element, "data-swipe", "");
              animate(
                [
                  { transform: "translateX(0)", opacity: 1 },
                  { transform: `translateX(${-step * 40}px)`, opacity: 0.6 }
                ],
                true
              );
              animation.pause();
              animation.currentTime = 0;
            },
            move: (value) => {
              animation.currentTime = value * 1000;
            },
            end: (complete, value) => {
              const current = gesture;

              gesture = undefined;
              dom.remove(element, "data-swipe");
              if (complete) select(current.index, -current.step);
              else
                animate([
                  {
                    transform: `translateX(${-step * 40 * value}px)`,
                    opacity: 1 - 0.4 * value
                  },
                  { transform: "translateX(0)", opacity: 1 }
                ]);
            }
          })
        );
      }
      Promise.all([
        emoji.load(),
        api(`${route.emoji}/ogq`, {
          signal: AbortSignal.timeout(6500),
          cache: "no-store"
        })
      ]).then(([catalog, response]) => {
        if (closed) return;
        loading.destroy();
        basic.push(...catalog.groups);
        const data = response.data;

        let packs = [];

        if (
          response.ok &&
          Array.isArray(data?.groups) &&
          data.groups.every(
            (group) =>
              typeof group.title === "string" &&
              typeof group.icon === "string" &&
              Array.isArray(group.items) &&
              group.items.every((item) => attachment.ogq(item))
          ) &&
          Array.isArray(data.recent)
        ) {
          packs = data.groups;
          const owned = packs.flatMap((group) => group.items);

          recent.push(
            ...data.recent.filter((item) =>
              item?.type === "ogq"
                ? owned.some(
                    (value) =>
                      value.ogq_id === item.ogq_id &&
                      value.number === item.number
                  )
                : item?.type === "emoji" &&
                  (emojis.includes(item.value) || emoji.get(item.value))
            )
          );
        }
        show(packs, true);
        if (catalog.unavailable)
          toast({ text: "chatting.emoji.unavailable", type: "warning" });
      });
    }
  }).finally(() => {
    closed = true;
    off.forEach((remove) => remove());
    observer.disconnect();
    if (slot.parentNode) {
      slot.replaceWith(value);

      if (hint === null) dom.remove(value, "enterkeyhint");
      else dom.set(value, "enterkeyhint", hint);
    }

    if (clear && home) {
      home.prepend(clear);
    }
    if (attachmentSlot.parentNode) attachmentSlot.replaceWith(attached);
    animation?.cancel();
    loading.destroy();
  });
}
