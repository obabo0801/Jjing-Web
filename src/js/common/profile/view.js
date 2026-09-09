import * as dom from "#common/dom";
import viewer from "#common/image/view";
import * as i18n from "#common/i18n";
import popover from "#common/popover";
import * as profile from "#common/profile";
import avatar from "#common/avatar";
import once from "#common/once";
import mount from "#common/mount";
import * as actions from "#common/profile/actions";

const opening = once();

const keys = [
  "profile.uid",
  "profile.email",
  "profile.userIp",
  "profile.accessIp",
  "profile.date",
  "profile.last",
  "profile.os",
  "profile.browser",
  "profile.lang",
  "profile.access",
  "profile.environment",
  "profile.blocked",
  "profile.unblock",
  "profile.unblockReason",
  "profile.blockTime",
  "profile.handler",
  "profile.authority",
  "profile.memo",
  "profile.editMemo",
  "profile.granted",
  "profile.activity",
  "profile.none",
  "profile.counts",
  "profile.saveError",
  "toggle.on",
  "toggle.off",
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

i18n.preload(...keys);

const relative = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(
    value.includes("T") ? value : `${value.replace(" ", "T")}+09:00`
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
    units.find(([, size]) => Math.abs(seconds) >= size) ?? units.at(-1);
  const lang = dom.root.lang || navigator.language;

  return new Intl.RelativeTimeFormat(lang, { numeric: "always" }).format(
    Math.round(seconds / size),
    unit
  );
};

const setState = (status, last, value, time, blocked) => {
  const state = ["online", "away"].includes(value) ? value : "offline";

  dom.set(status, "data-state", state);
  dom.remove(last, "data-i18n");
  if (blocked) {
    dom.set(last, "data-blocked", "");
    dom.set(last, "data-i18n", "profile.blocked");
    last.textContent = i18n.message("profile.blocked") || "";
    return;
  }
  dom.remove(last, "data-blocked");

  if (state === "offline") {
    last.textContent = relative(time);
    return;
  }

  const key = state === "online" ? "profile.active" : "profile.away";

  dom.set(last, "data-i18n", key);
  last.textContent = i18n.message(key);
};

const request = async (options) => {
  const uid = options.own ? "me" : options.uid;

  if (!uid) {
    return null;
  }

  const result = await profile.read(uid, { fresh: true });

  return result.ok ? result.data : null;
};

const tabs = (options) => {
  if (!Array.isArray(options.tabs) || !options.tabs.length) {
    return null;
  }

  const element = dom.create("div");

  element.className = "segment";
  options.tabs.forEach((tab, index) => {
    const button = dom.create("button");

    button.type = "button";
    button.textContent = i18n.message(tab);
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
  let admin;
  let signature;

  dom.set(media.root, "data-response", "");

  const render = (value) => {
    Object.assign(user, value);
    media.set(user.avatar || options.avatar || "");
    name.textContent = user.name || options.name || "";
    uid.textContent = user.short || user.uid?.slice(0, 8) || "";

    setState(status, last, user.state, user.last || options.last, user.blocked);

    const next = JSON.stringify([
      user.manage,
      user.details,
      user.blocked,
      user.block,
      user.authority
    ]);

    if (signature !== undefined && signature !== next) {
      const content = actions.manage(user, target, options, handlers, opening);

      if (admin) {
        if (content) admin.replaceWith(content);
        else admin.remove();
      } else if (content) head.after(content);
      admin = content;
      if (content) mount(content);
      i18n.translate();
    }
    signature = next;

    const whisper = dom.query("[data-whisper]", root);

    if (whisper) {
      whisper.hidden = user.state === "offline";
    }
  };

  render(user);
  dom.on(media.root, "click", () => {
    const source =
      user.image || user.avatar || options.image || options.avatar || "";

    viewer(source, media.root, "user").catch(() => {});
  });
  picture.append(media.root, status);
  head.append(picture, name, uid, last);
  root.append(head);

  const segment = tabs(options);

  admin = actions.manage(user, target, options, handlers, opening);

  if (segment) {
    root.append(segment);
  }

  if (admin) {
    root.append(admin);
  }

  if (options.context === "chatting") {
    root.append(actions.context(user, target, options, handlers));
  }

  if (user.uid) {
    profile.bind(root, user.uid, render);
  }

  return root;
};

async function open(anchor, target, options) {
  const result = await request(options);
  const handlers = new Map();
  const user = result ?? {
    uid: options.uid || "",
    short: options.uid?.slice(0, 8) || "",
    name: options.name || "",
    image: options.image || "",
    avatar: options.avatar || "",
    self: Boolean(options.own),
    state: options.state || (options.online ? "online" : "offline"),
    last: options.last || "",
    manage: false
  };

  const value = await popover({
    anchor,
    back: true,
    content: content(user, target, options, handlers),
    direction: "←",
    scroll: 0
  });

  return handlers.get(value)?.();
}

export default function view(anchor, target, options) {
  const key = options.own ? "me" : options.uid || anchor || target;

  return opening(key, () => open(anchor, target, options));
}
