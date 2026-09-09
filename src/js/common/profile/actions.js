import * as dom from "#common/dom";
import dialog from "#common/dialog";
import drawer from "#common/drawer";
import * as i18n from "#common/i18n";
import * as profile from "#common/profile";
import line from "#common/line";
import label from "#common/profile/label";
import authority from "#common/profile/authority";

const emit = (target, type, detail) => {
  target?.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
};

const item = (handlers, data) => {
  const { text, icon, run } = data;
  const { danger, next, close = true } = data;
  const row = dom.create("div");
  const button = dom.create("button");
  const label = dom.create("span");

  row.className = "group-item";
  button.type = "button";
  label.textContent = i18n.message(text);

  dom.set(button, "data-icon", icon);
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
  element.append(...items.filter(Boolean));
  element.hidden = !element.childElementCount;

  return element;
};

const hidden = (target, options) => {
  const value = dom.create("span");
  const row = dom.create("div");
  const field = dom.create("div");
  const label = dom.create("label");
  const text = dom.create("span");
  const input = dom.create("input");

  row.className = "group-item";
  dom.set(value, "data-icon", "eye-off");
  field.className = "switch";
  text.textContent = i18n.message("profile.hide");
  input.type = "checkbox";
  input.name = "chatting-hide";
  input.checked = Boolean(options.hidden);

  dom.set(text, "data-i18n", "profile.hide");
  dom.on(input, "change", () => {
    emit(target, "chatting-hide", { ...options, hidden: input.checked });
  });

  value.append(text);
  label.append(value, input);
  field.append(label);
  row.append(field);

  return row;
};

const block = async (user) => {
  const blocked = user.blocked;
  const field = dom.create("div");
  const input = dom.create("input");

  field.className = "input";
  input.name = "block-reason";
  input.autocomplete = "off";
  input.enterKeyHint = "done";
  input.maxLength = 500;

  dom.set(input, "data-control", "");
  dom.set(
    input,
    "data-i18n-placeholder",
    blocked ? "profile.unblockReason" : "profile.blockReason"
  );
  field.append(input);

  const confirmed = await dialog({
    title: blocked ? "profile.unblock" : "profile.blockTitle",
    content: field,
    actions: [
      { text: "profile.cancel", value: false, data: ["data-neutral"] },
      {
        text: "profile.confirm",
        submit: true,
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

  const result = blocked
    ? await profile.unblock(user.uid, input.value.trim())
    : await profile.block(user.uid, input.value.trim());

  if (!result.ok) {
    await dialog({ title: "profile.saveError" });
    return;
  }
  await profile.read(user.uid, { fresh: true });
};

export const manage = (user, target, options, handlers, opening) => {
  if (!user.manage || !user.details) {
    return null;
  }

  const details = user.details;
  const element = dom.create("section");

  element.className = "profile-section";
  element.append(
    group(
      label("profile.uid", details.uid, { short: true }),
      label("profile.email", details.email)
    ),
    ...(details.date || details.userIp || details.last || details.accessIp
      ? [line({ type: "dotted", text: "profile.access", icon: "info" })]
      : []),
    group(
      label("profile.date", details.date, { date: true }),
      label("profile.userIp", details.userIp),
      label("profile.last", details.last, { date: true }),
      label("profile.accessIp", details.accessIp)
    ),
    ...(details.os || details.browser || details.lang
      ? [line({ type: "dotted", text: "profile.environment", icon: "theme" })]
      : []),
    group(
      label("profile.os", details.os),
      label("profile.browser", details.browser),
      label("profile.lang", details.lang)
    ),
    group(
      user.authority ? authority(user) : null,
      ...(user.blocked
        ? [
            label("profile.blockReason", user.block?.reason),
            label("profile.blockTime", user.block?.time),
            label("profile.handler", user.block?.handler || user.block?.actor)
          ]
        : [
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
            })
          ]),
      item(handlers, {
        text: user.blocked ? "profile.unblock" : "profile.block",
        icon: "error",
        danger: true,
        close: false,
        run: () => opening(`block:${user.uid}`, () => block(user))
      })
    )
  );
  if (user.blocked) element.lastElementChild.classList.add("profile-block");

  return element;
};

export const context = (user, target, options, handlers) => {
  const gift = item(handlers, {
    text: "profile.gift",
    icon: "gift",
    next: true,
    close: false,
    run: () =>
      drawer({
        back: true,
        title: "profile.gift",
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
