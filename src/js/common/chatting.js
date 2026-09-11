import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as emoji from "#common/emoji";
import editor, { enter } from "#common/chatting/input";
import action from "#common/chatting/action";
import profile from "#common/chatting/profile";
import * as registry from "#common/chatting/registry";
import * as clock from "#common/chatting/time";
import * as events from "#common/events";
import listen from "#common/chatting/voice";
import media from "#common/chatting/media";
import { notices } from "#shared/chatting";
import { insert } from "#common/input";

i18n.preload(
  "chatting.tools.image",
  "chatting.voice",
  "chatting.send",
  "chatting.emoji.clear"
);

const bound = new WeakSet();
const groups = new WeakMap();
const observers = new WeakMap();
const records = new WeakMap();
const duration = 30 * 60 * 1000;

export const atBottom = (list) =>
  list.scrollHeight - list.scrollTop - list.clientHeight < 24;

const updateBottom = (list) => {
  const root = list.closest(".chatting");
  const button = dom.query(".chatting-bottom", root);

  if (button) {
    button.hidden = atBottom(list) && dom.get(root, "data-history") !== "true";
  }
};

const follow = (list, options, current) => {
  const id = options.id || (options.own ? "own" : "");

  if (!id) {
    groups.delete(list);
    return false;
  }

  const previous = groups.get(list);
  const passed = current - (previous?.start ?? current);
  const result = previous?.id === id && passed >= 0 && passed < duration;

  groups.set(list, { id, start: result ? previous.start : current });

  return result;
};

const bottom = (root, list, form) => {
  const button = dom.create("button");

  button.type = "button";
  button.className = "chatting-bottom";

  dom.set(button, "data-icon", "arrow");
  dom.set(button, "data-angle", "bottom");
  dom.set(button, "data-circle", "");
  dom.set(button, "data-background", "");
  dom.set(button, "data-shadow", "");

  dom.on(button, "click", () => {
    root.dispatchEvent(new CustomEvent("chatting-latest"));
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  });
  dom.on(list, "scroll", () => updateBottom(list));

  const place = () => {
    root.style.setProperty("--chatting-form", `${form.offsetHeight}px`);
  };

  place();

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(place);

    observer.observe(form);
    observers.set(root, observer);
  }

  root.append(button);
  updateBottom(list);
};

const update = (input, button) => {
  button.hidden =
    !input.value.trim() && !Number(dom.get(input.form, "data-attachments"));
};

export const regroup = (list) => {
  const dates = new Set();

  let previous;

  for (const node of [...list.children]) {
    if (node.matches(".chatting-system") && !records.has(node)) {
      if (previous) previous.id = null;
      continue;
    }
    const item = records.get(node);

    if (!item) continue;
    if (node.hidden) {
      item.separator?.remove();
      item.separator = null;
      continue;
    }
    const date = clock.day(item.current);
    const sameDay = previous?.date === date;
    const follow =
      !item.options.system &&
      sameDay &&
      previous.id === item.options.id &&
      item.current - previous.start >= 0 &&
      item.current - previous.start < duration;

    if (follow) dom.set(node, "data-follow", "");
    else dom.remove(node, "data-follow");
    if (!sameDay) {
      if (!item.separator) {
        item.separator = dom.create("time");
        item.separator.className = "chatting-date";
        item.separator.dateTime = date;
        item.separator.textContent = clock.label(item.current);
      }
      list.insertBefore(item.separator, node);
      dates.add(item.separator);
    } else {
      item.separator?.remove();
      item.separator = null;
    }
    previous = {
      id: item.options.system ? null : item.options.id,
      date,
      start: follow ? previous.start : item.current
    };
  }
  dom.all(".chatting-date", list).forEach((node) => {
    if (!dates.has(node)) node.remove();
  });
};

const bind = (element) => {
  if (bound.has(element)) {
    return;
  }

  const form = dom.query(".chatting-form", element);
  const list = dom.query(".chatting-list", element);
  const input = dom.query(".chatting-input", form);
  const action = dom.query(".chatting-voice", form);
  const send = dom.query(".chatting-send", form);
  const actions = send?.closest(".input-actions");
  const clear = dom.create("button");

  if (!form || !list || !input || !send) {
    return;
  }

  bottom(element, list, form);
  const field = editor(input);

  clear.type = "button";
  clear.className = "chatting-clear";
  dom.set(clear, "data-icon", "trash");
  dom.set(clear, "data-circle", "");
  dom.set(clear, "data-response", "");
  dom.set(clear, "data-tooltip", "chatting.emoji.clear");

  actions?.prepend(clear);

  const sync = () => {
    update(input, send);

    clear.hidden = !input.value;
    clear.disabled = input.disabled || input.readOnly;
  };

  dom.on(clear, "click", () => {
    if (!input.value) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;

    input.setSelectionRange(0, input.value.length);

    if (!insert(input, "")) {
      input.setSelectionRange(start, end);
    }
  });

  sync();

  dom.on(input, "input", sync);
  dom.on(form, "chatting-attachments", sync);
  dom.on(list, "chatting-regroup", () => regroup(list));

  dom.on(field, "keydown", (event) => {
    if (!enter(event)) {
      return;
    }

    event.preventDefault();

    if (dom.has("wearable")) {
      return;
    }

    if (!send.hidden) {
      send.click();
    }
  });

  dom.on(action, "click", () => listen(input, action));

  dom.on(form, "reset", () => queueMicrotask(sync));

  bound.add(element);
};

export const append = (target, options = {}, scroll = true) => {
  if (options.system) {
    const notice = notices[options.system];

    if (!notice || (notice.admin && !events.isAdmin())) return null;
    return system(target, { ...options, ...notice, params: options, scroll });
  }
  const list = target?.matches?.(".chatting-list")
    ? target
    : dom.query(".chatting-list", target);

  if (
    !list ||
    (!options.text &&
      !options.image &&
      !options.audio &&
      !options.attachments?.length)
  ) {
    return null;
  }

  const stick = atBottom(list);
  const current = clock.stamp(options.time);
  const message = dom.create("article");
  const user = profile(message, options);
  const text = dom.create("p");
  const time = dom.create("time");

  message.className = "chatting-message";
  text.className = "chatting-text";
  time.className = "chatting-time";

  emoji.render(text, options.text);
  if (options.audio) {
    const audio = dom.create("audio");

    audio.className = "chatting-audio";
    audio.controls = true;
    audio.preload = "none";
    audio.src = options.audio;
    text.append(audio);
  }
  media(text, options);
  time.textContent = clock.format(current);
  time.dateTime = new Date(current).toISOString();
  time.title = clock.detail(current);

  if (options.own) {
    dom.set(message, "data-own", "");
  }

  if (options.deleted) {
    dom.set(message, "data-deleted", "");
  }

  if (options.url) {
    registry.storedMessage(message, options.url);
  }

  if (options.id) {
    registry.message(message, options.id);

    if (options.blocked ?? events.isBlocked(options.id)) {
      if (options.blocked === undefined && !events.isAdmin()) {
        return null;
      }

      dom.set(message, "data-blocked", "");
    }
  }

  if (follow(list, options, current)) {
    dom.set(message, "data-follow", "");
  }

  message.append(user, text);

  if (time.textContent) {
    message.append(time);
  }

  if (!options.deleted) {
    action(message, options);
  }

  records.set(message, { options, current });

  list.append(message);

  if (scroll && (stick || options.own)) {
    list.scrollTop = list.scrollHeight;
  }

  requestAnimationFrame(() => updateBottom(list));

  return message;
};

export function system(target, options = {}) {
  const list = target?.matches?.(".chatting-list")
    ? target
    : dom.query(".chatting-list", target);

  if (!list || !options.text) return null;
  const stick =
    options.scroll === true || (options.scroll !== false && atBottom(list));
  const node = dom.create("p");
  const types = ["text", "mute", "info", "success", "warning", "error"];

  node.className = "chatting-system";
  dom.set(
    node,
    "data-type",
    types.includes(options.type) ? options.type : "text"
  );
  if (options.bold) dom.set(node, "data-bold", "");
  node.textContent = (i18n.message(options.text) || options.text).replace(
    /\{(\w+)\}/g,
    (match, key) => String(options.params?.[key] ?? match)
  );
  const last = list.lastElementChild;

  list.insertBefore(node, last?.matches(".chatting-page") ? last : null);
  if (options.time)
    records.set(node, { options, current: clock.stamp(options.time) });
  groups.delete(list);
  if (stick) list.scrollTop = list.scrollHeight;
  updateBottom(list);
  return node;
}

export default function chatting(root = document) {
  dom.find(".chatting", root).forEach(bind);
}
