import * as dom from "#common/dom";
import action from "#common/chatting/action";
import profile from "#common/chatting/profile";
import * as registry from "#common/chatting/registry";
import * as clock from "#common/chatting/time";
import * as events from "#common/events";
import voice from "#common/voice";

const bound = new WeakSet();
const groups = new WeakMap();
const observers = new WeakMap();
const duration = 30 * 60 * 1000;

const atBottom = (list) =>
  list.scrollHeight - list.scrollTop - list.clientHeight <
  24;

const updateBottom = (list) => {
  const root = list.closest(".chatting");
  const button = dom.query(".chatting-bottom", root);

  if (button) {
    button.hidden = atBottom(list);
  }
};

const follow = (list, options, current) => {
  const uid = options.uid || (options.own ? "own" : "");

  if (!uid) {
    groups.delete(list);
    return false;
  }

  const previous = groups.get(list);
  const passed = current - (previous?.start ?? current);
  const result =
    previous?.uid === uid &&
    passed >= 0 &&
    passed < duration;

  groups.set(list, {
    uid,
    start: result ? previous.start : current
  });

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
    list.scrollTo({
      top: list.scrollHeight,
      behavior: "smooth"
    });
  });
  dom.on(list, "scroll", () => updateBottom(list));

  const place = () => {
    root.style.setProperty(
      "--chatting-form",
      `${form.offsetHeight}px`
    );
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
  button.hidden = !input.value.trim();
};

const listen = async (input) => {
  const result = await voice([], input);

  if (result.action === "none" || !result.text) {
    return;
  }

  const value = input.value.trim();

  input.value = value
    ? `${value} ${result.text}`
    : result.text;

  input.dispatchEvent(
    new Event("input", { bubbles: true })
  );
  input.focus({ preventScroll: true });
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

  if (!form || !list || !input || !action || !send) {
    return;
  }

  bottom(element, list, form);
  update(input, send);

  dom.on(input, "input", () => update(input, send));
  dom.on(input, "keydown", (event) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.isComposing
    ) {
      return;
    }

    event.preventDefault();

    if (input.value.trim()) {
      send.click();
    }
  });
  dom.on(action, "click", () => listen(input));

  dom.on(form, "reset", () =>
    queueMicrotask(() => update(input, send))
  );

  bound.add(element);
};

export const append = (target, options = {}) => {
  const list = target?.matches?.(".chatting-list")
    ? target
    : dom.query(".chatting-list", target);

  if (!list || !options.text) {
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

  text.textContent = options.text;
  time.textContent = clock.format(current);
  time.dateTime = new Date(current).toISOString();
  time.title = clock.detail(current);

  if (options.own) {
    dom.set(message, "data-own", "");
  }

  if (options.uid) {
    registry.message(message, options.uid);

    if (events.isBlocked(options.uid)) {
      if (!events.isAdmin()) {
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

  action(message, options);

  list.append(message);

  if (stick || options.own) {
    list.scrollTop = list.scrollHeight;
  }

  requestAnimationFrame(() => updateBottom(list));

  return message;
};

export default function chatting(root = document) {
  const elements = root.matches?.(".chatting")
    ? [root]
    : dom.all(".chatting", root);

  elements.forEach(bind);
}
