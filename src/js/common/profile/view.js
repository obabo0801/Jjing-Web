import * as dom from "#common/dom";
import dialog from "#common/dialog";
import drawer from "#common/drawer";
import viewer from "#common/image/view";
import { message, preload } from "#common/i18n";
import popover from "#common/popover";
import * as profile from "#common/profile";
import avatar from "#common/avatar";

const keys = [
  "profile.uid",
  "profile.email",
  "profile.userIp",
  "profile.accessIp",
  "profile.date",
  "profile.os",
  "profile.copy",
  "profile.chatMute",
  "profile.kick",
  "profile.block",
  "profile.blockTitle",
  "profile.blockReason",
  "profile.cancel",
  "profile.confirm",
  "profile.gift",
  "profile.message",
  "profile.whisper",
  "profile.hide",
  "profile.report",
  "profile.active",
  "profile.away"
];

preload(...keys);

const emit = (target, type, detail) => {
  target?.dispatchEvent(
    new CustomEvent(type, { bubbles: true, detail })
  );
};

const relative = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(
    value.includes("T")
      ? value
      : `${value.replace(" ", "T")}+09:00`
  );
  const seconds = (date.getTime() - Date.now()) / 1000;

  if (!Number.isFinite(seconds)) {
    return "";
  }

  const units = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60]
  ];

  const [unit, size] =
    units.find(([, size]) => Math.abs(seconds) >= size) ??
    units.at(-1);
  const lang = dom.root.lang || navigator.language;

  return new Intl.RelativeTimeFormat(lang, {
    numeric: "always"
  }).format(Math.round(seconds / size), unit);
};

const setState = (status, last, value, time) => {
  const state = ["online", "away"].includes(value)
    ? value
    : "offline";

  dom.set(status, "data-state", state);
  dom.remove(last, "data-i18n");

  if (state === "offline") {
    last.textContent = relative(time);
    return;
  }

  const key =
    state === "online" ? "profile.active" : "profile.away";

  dom.set(last, "data-i18n", key);
  last.textContent = message(key) || key;
};

const copy = async (value) => {
  if (value) {
    await navigator.clipboard.writeText(value);
  }
};

const item = (handlers, data) => {
  const { text, icon, run } = data;
  const { danger, next, close = true } = data;
  const row = dom.create("div");
  const button = dom.create("button");
  const label = dom.create("span");

  row.className = "group-item";
  button.type = "button";
  label.textContent = text;

  dom.set(row, "data-icon", icon);
  dom.set(label, "data-i18n", text);
  dom.set(button, "data-response", "");
  button.append(label);

  if (close) {
    dom.set(button, "data-layer-action", text);
    handlers.set(text, run);
  } else {
    dom.on(button, "click", run);
  }

  if (danger) {
    dom.set(row, "data-danger", "");
  }

  if (next) {
    const arrow = dom.create("span");

    arrow.className = "profile-next";
    dom.set(arrow, "data-icon", "arrow");
    button.append(arrow);
  }

  row.append(button);

  return row;
};

const group = (...items) => {
  const element = dom.create("div");

  element.className = "group";
  element.append(...items);

  return element;
};

const hidden = (target, options) => {
  const row = dom.create("div");
  const field = dom.create("div");
  const label = dom.create("label");
  const text = dom.create("span");
  const input = dom.create("input");

  row.className = "group-item";
  dom.set(row, "data-icon", "eye-off");
  field.className = "switch";
  text.textContent = "profile.hide";
  input.type = "checkbox";
  input.name = "chatting-hide";
  input.checked = Boolean(options.hidden);

  dom.set(text, "data-i18n", "profile.hide");
  dom.on(input, "change", () => {
    emit(target, "chatting-hide", {
      ...options,
      hidden: input.checked
    });
  });

  label.append(text, input);
  field.append(label);
  row.append(field);

  return row;
};

const label = (key, value) => {
  const row = dom.create("div");
  const element = dom.create("div");
  const name = dom.create("span");
  const result = dom.create("div");
  const text = dom.create("span");
  const button = dom.create("button");

  row.className = "group-item";
  element.className = "label";
  name.className = "label-key";
  result.className = "profile-value";
  text.className = "label-value";
  button.className = "profile-copy";
  button.type = "button";
  button.disabled = !value;

  name.textContent = key;
  text.textContent = value || "-";

  dom.set(name, "data-i18n", key);
  dom.set(button, "data-icon", "copy");
  dom.set(button, "data-tooltip", "profile.copy");
  dom.set(button, "data-response", "");
  dom.set(button, "data-opacity", "");

  dom.on(button, "click", () => {
    copy(value).catch(() => {});
  });

  result.append(text, button);
  element.append(name, result);
  row.append(element);

  return row;
};

const request = async (options) => {
  const uid = options.own ? "me" : options.uid;

  if (!uid) {
    return null;
  }

  const result = await profile.read(uid, { fresh: true });

  return result.ok ? result.data : null;
};

const block = async (user) => {
  const field = dom.create("div");
  const input = dom.create("input");

  field.className = "input";
  input.name = "block-reason";
  input.autocomplete = "off";

  dom.set(input, "data-control", "");
  dom.set(
    input,
    "data-i18n-placeholder",
    "profile.blockReason"
  );
  field.append(input);

  const confirmed = await dialog({
    title: "profile.blockTitle",
    content: field,
    actions: [
      {
        text: "profile.cancel",
        value: false,
        data: ["data-neutral"]
      },
      {
        text: "profile.confirm",
        value: true,
        data: ["data-danger"],
        disabled: () => !input.value.trim()
      }
    ],
    locked: true
  });

  if (!confirmed) {
    return;
  }

  await profile.block(user.uid, input.value.trim());
};

const manage = (user, target, options, handlers) => {
  if (!user.manage || !user.details) {
    return null;
  }

  const details = user.details;
  const element = dom.create("section");

  element.className = "profile-section";
  element.append(
    group(
      label("profile.uid", details.uid),
      label("profile.email", details.email),
      label("profile.userIp", details.userIp),
      label("profile.accessIp", details.accessIp),
      label("profile.date", details.date),
      label("profile.os", details.os),
      item(handlers, {
        text: "profile.chatMute",
        icon: "tts-mute",
        danger: true,
        close: false,
        run: () => emit(target, "chatting-mute", options)
      }),
      item(handlers, {
        text: "profile.kick",
        icon: "arrow",
        danger: true,
        close: false,
        run: () => emit(target, "chatting-kick", options)
      }),
      item(handlers, {
        text: "profile.block",
        icon: "error",
        danger: true,
        close: false,
        run: () => block(user)
      })
    )
  );

  return element;
};

const context = (user, target, options, handlers) => {
  const gift = item(handlers, {
    text: "profile.gift",
    icon: "gift",
    next: true,
    close: false,
    run: () =>
      drawer({
        back: true,
        content: dom.create("div"),
        side: "right",
        direction: "→"
      })
  });
  const element = dom.create("section");

  element.className = "profile-section";
  element.append(group(gift));

  if (!user.self) {
    const whisper = item(handlers, {
      text: "profile.whisper",
      icon: "whisper",
      run: () => emit(target, "chatting-whisper", options)
    });

    dom.set(whisper, "data-whisper", "");
    whisper.hidden = user.state === "offline";

    const items = [
      item(handlers, {
        text: "profile.message",
        icon: "mail",
        run: () => emit(target, "chatting-message", options)
      }),
      whisper
    ];

    items.push(
      hidden(target, options),
      item(handlers, {
        text: "profile.report",
        icon: "flag",
        danger: true,
        run: () => emit(target, "chatting-report", options)
      })
    );
    element.append(group(...items));
  }

  return element;
};

const tabs = (options) => {
  if (
    !Array.isArray(options.tabs) ||
    !options.tabs.length
  ) {
    return null;
  }

  const element = dom.create("div");

  element.className = "segment";
  options.tabs.forEach((tab, index) => {
    const button = dom.create("button");

    button.type = "button";
    button.textContent = tab;
    dom.set(button, "data-i18n", tab);
    dom.set(button, "data-background", "");

    if (!index) {
      dom.set(button, "data-selected", "");
    }

    element.append(button);
  });

  return element;
};

const content = (user, target, options, handlers) => {
  const root = dom.create("div");
  const head = dom.create("header");
  const picture = dom.create("div");
  const media = avatar("", "button");
  const status = dom.create("span");
  const name = dom.create("strong");
  const uid = dom.create("span");
  const last = dom.create("time");

  root.className = "profile";
  head.className = "profile-head";
  picture.className = "profile-avatar";
  status.className = "profile-status";
  name.className = "profile-name";
  uid.className = "profile-uid";
  last.className = "profile-last";

  dom.set(media.root, "data-response", "");

  const render = (value) => {
    Object.assign(user, value);
    media.set(user.avatar || options.avatar || "");
    name.textContent = user.name || options.name || "";
    uid.textContent =
      user.short || user.uid?.slice(0, 8) || "";

    setState(
      status,
      last,
      user.state,
      user.last || options.last
    );

    const whisper = dom.query("[data-whisper]", root);

    if (whisper) {
      whisper.hidden = user.state === "offline";
    }
  };

  render(user);
  dom.on(media.root, "click", () => {
    const source =
      user.image ||
      user.avatar ||
      options.image ||
      options.avatar ||
      "";

    if (source) {
      viewer(source, media.root).catch(() => {});
    }
  });
  picture.append(media.root, status);
  head.append(picture, name, uid, last);
  root.append(head);

  const segment = tabs(options);
  const admin = manage(user, target, options, handlers);

  if (segment) {
    root.append(segment);
  }

  if (admin) {
    root.append(admin);
  }

  if (options.context === "chatting") {
    root.append(context(user, target, options, handlers));
  }

  if (user.uid) {
    profile.bind(root, user.uid, render);
  }

  return root;
};

export default async function view(
  anchor,
  target,
  options
) {
  const result = await request(options);
  const handlers = new Map();
  const user = result ?? {
    uid: options.uid || "",
    short: options.uid?.slice(0, 8) || "",
    name: options.name || "",
    image: options.image || "",
    avatar: options.avatar || "",
    self: Boolean(options.own),
    state:
      options.state ||
      (options.online ? "online" : "offline"),
    last: options.last || "",
    manage: false
  };

  const value = await popover({
    anchor,
    back: true,
    content: content(user, target, options, handlers),
    direction: "↑",
    scroll: 0
  });

  return handlers.get(value)?.();
}
