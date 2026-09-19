import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as storage from "#common/storage";
import * as theme from "#common/theme";
import * as settings from "#common/settings";
import * as usage from "#common/data";
import * as push from "#common/push";
import * as routes from "#shared/route";
import * as route from "#common/route";
import popover from "#common/popover";
import drawer from "#common/drawer";
import dialog from "#common/dialog";
import legal from "#common/legal";
import toolbar from "#common/toolbar";
import label from "#common/profile/label";
import * as names from "#common/profile/name";
import toast from "#common/toast";
import caption from "#common/caption";
import * as link from "#common/link";
import api from "#common/api";
import sound from "#common/sound";
import vibrate from "#common/vibrate";
import * as tts from "#common/tts";
import * as rooms from "#common/room";
import events from "#common/events";
import online from "#common/online";
import * as assets from "#common/chatting/assets";
import * as direct from "#common/chatting/direct";
import retry from "#common/retry";
import progress from "#common/progress";
import { version } from "#package";
import "../../css/common/menu.css";

const sounds = ["master", "media", "notify", "tts", "system", "preview"];

const keys = [
  "menu.title",
  "menu.language",
  "menu.chatSettings",
  "menu.chatMenu",
  "direct.mute",
  "direct.unmute",
  "direct.leave",
  "online.open",
  "chatting.receiveWhisper",
  "chatting.receiveMessage",
  "menu.theme",
  "menu.sound",
  "menu.notification",
  "menu.data",
  "menu.error",
  "menu.contact",
  "menu.contactInfo",
  "contact.waiting",
  "contact.handler",
  "contact.end",
  "menu.version",
  "menu.unavailable",
  "menu.devices",
  "menu.rename",
  "menu.disconnect",
  "menu.unregister",
  "menu.unregisterInfo",
  "menu.disconnectInfo",
  "menu.blocked",
  "menu.blockedInfo",
  "menu.chat",
  "menu.mention",
  "menu.web",
  "menu.unnamed",
  "menu.chatOn",
  "menu.chatOff",
  "menu.deviceSettings",
  "profile.os",
  "profile.browser",
  "theme.brightness",
  "language.system",
  "language.ko",
  "toggle.on",
  "toggle.off",
  "terms.title",
  "privacy.title",
  "data.usage",
  "data.cookie",
  "data.data",
  "dialog.confirm",
  "dialog.cancel",
  "profile.confirm",
  ...theme.modes.map((mode) => `theme.${mode}`),
  ...sounds.map((key) => `sound.${key}`)
];

i18n.preload(...keys);

const node = (tag, name, key) => {
  const element = dom.create(tag);

  if (name) element.className = name;

  if (key) text(element, key);

  if (tag === "button") dom.set(element, "data-response", "");

  return element;
};

function text(element, key) {
  element.textContent = i18n.message(key);
  dom.set(element, "data-i18n", key);
}

const mark = (element, name, color = false) => {
  dom.set(element, "data-icon", name);
  element.toggleAttribute("data-color", color);
};

const fail = () => toast({ title: "menu.error", type: "error" });
const on = (key) => storage.get(key, "true") !== "false";
const group = (...items) => {
  const root = node("div", "group");

  for (const item of items) {
    const row = node("div", "group-item");

    row.append(item);
    root.append(row);
  }

  return root;
};

const section = (key, content) => {
  const root = node("section", "group-section");

  root.append(node("h3", "group-title", key), content);

  return root;
};

const sections = {
  "menu.language": "language",
  "menu.chatSettings": "chat",
  "menu.theme": "theme",
  "menu.sound": "sound",
  "menu.notification": "notifications",
  "menu.data": "data",
  "menu.contact": "contact"
};

const open = (title, content, options = {}) =>
  drawer({
    route: sections[title] ? ["settings-section", sections[title]] : undefined,
    title,
    content,
    back: true,
    side: "right",
    direction: "→",
    ...options
  });

const field = (type, key, icon, value, save) => {
  const root = node("div", type);
  const label = node("label");
  const title = node("span", "group-name", key);
  const input = node("input");

  if (icon)
    mark(
      title,
      icon,
      ["kr", "sun", "moon", "moon-full", "chat", "mention", "notify-ring"].includes(icon)
    );

  input.type = type === "radio" ? "radio" : "checkbox";
  input.checked = value;
  label.append(title, input);
  root.append(label);
  if (save)
    dom.on(input, "change", async () => {
      const previous = !input.checked;

      input.disabled = true;
      try {
        if (!(await save(input.checked))) {
          input.checked = previous;
          fail();
        }
      } catch {
        input.checked = previous;
        fail();
      } finally {
        input.disabled = false;
      }
    });

  return { root, input, title };
};

const master = (key, icon, value, save, expand, current) => {
  if (!expand) {
    const control = field(
      "switch",
      value ? "toggle.on" : "toggle.off",
      "",
      value,
      async (enabled) => {
        const ok = await save(enabled);

        text(control.title, (ok ? enabled : !enabled) ? "toggle.on" : "toggle.off");

        return ok;
      }
    );

    return control.root;
  }

  const root = node("div", "toggle");
  const head = node("div", "toggle-head");
  const button = node("button", "toggle-button");
  const title = node("span", "group-name", key);
  const control = field("switch", key, "", value, save);

  control.root.classList.add("toggle-switch");
  control.title.className = "toggle-label";
  button.type = "button";
  mark(button, icon, true);
  button.append(title);
  dom.on(button, "click", async (event) => {
    event.stopPropagation();
    button.disabled = true;
    try {
      await expand();
    } catch {
      fail();
    } finally {
      control.input.checked = await current();
      button.disabled = false;
    }
  });

  head.append(button, control.root);
  root.append(head);

  return root;
};

const entry = (key, icon, run, current) => {
  const button = node("button");
  const title = node("span", "group-name", key);
  const value = node("span", "label-value");
  const arrow = node("span", "group-next");

  button.type = "button";
  mark(button, icon, true);
  mark(arrow, "arrow");

  const update = async () => {
    if (current) value.textContent = await current();
  };

  button.append(title, value, arrow);
  update();
  dom.on(button, "click", async () => {
    if (button.disabled) return;

    button.disabled = true;
    try {
      await run();
    } catch {
      fail();
    } finally {
      button.disabled = false;
      await update();
    }
  });

  return button;
};

const options = (values, selected, type, save) => {
  const choices = values.map(([value, key, icon]) => {
    const item = field(type, key, icon, value === selected);

    item.input.name = `settings-${type}`;
    dom.on(item.input, "change", async () => {
      const old = selected;

      choices.forEach((choice) => {
        choice.input.disabled = true;
      });

      let ok = false;

      try {
        ok = await save(value);
      } catch {}

      if (ok) selected = value;
      else {
        selected = old;
        fail();
      }

      choices.forEach((choice) => {
        choice.input.disabled = false;
        choice.input.checked = choice.value === selected;
      });
    });

    return { ...item, value };
  });

  return group(...choices.map((choice) => choice.root));
};

const language = () => {
  const content = node("div", "settings");

  content.append(
    options(
      [
        ["system", "language.system", "setting"],
        ["ko", "language.ko", "kr"]
      ],
      storage.get("lang", "system"),
      "checkbox",
      async (value) => {
        const previous = storage.get("lang", "system");

        if (!storage.set("lang", value)) return false;

        if (await i18n.translate(value)) return true;

        await i18n.translate(previous);

        return false;
      }
    )
  );

  return open("menu.language", content);
};

const slider = (key, value, min, save, icon) => {
  const root = node("label", "range-label");
  const label = node("span", "group-name");
  const name = node("span", "range-name", key);
  const range = node("div", "range");
  const track = node("div", "range-track");
  const fill = node("div", "range-fill");
  const thumb = node("div", "range-thumb");
  const output = node("output", "range-value");
  const input = node("input");

  input.type = "range";
  input.min = min;
  input.max = 100;
  input.step = 1;
  input.value = value;

  const update = () => {
    mark(label, typeof icon === "function" ? icon(Number(input.value)) : icon, true);
    output.textContent = input.value;
  };

  dom.on(input, "input", () => {
    if (save(Number(input.value))) value = Number(input.value);
    else {
      input.value = value;
      fail();
    }

    update();
  });

  track.append(fill);
  range.append(track, thumb, input);
  label.append(name);
  root.append(label, range, output);
  update();

  return { root, input };
};

const appearance = () => {
  const content = node("div", "settings");
  const icons = { system: "setting", light: "sun", dark: "moon-full", black: "moon" };

  content.append(
    options(
      theme.modes.map((mode) => [mode, `theme.${mode}`, icons[mode] || "theme"]),
      theme.default(),
      "radio",
      (value) => theme.default(value) === value
    )
  );

  dom.set(content.firstElementChild, "data-view", "grid");

  content.append(
    group(
      slider("theme.brightness", storage.get("brightness", 100), 70, theme.brightness, (value) =>
        value < 80 ? "moon-full" : value < 90 ? "moon" : value < 96 ? "sun-low" : "sun"
      ).root
    )
  );

  return open("menu.theme", content);
};

const setSound = (enabled) => {
  const ok = storage.set("sound", enabled);

  if (ok && !enabled) sound.stop();

  return ok;
};

const audio = async () => {
  const content = node("div", "settings");
  const icons = {
    master: (value) => (value <= 0 ? "volume-mute" : value < 50 ? "volume-low" : "volume-high"),
    media: (value) => (value <= 0 ? "media-mute" : "media"),
    notify: (value) => (value <= 0 ? "notify-mute" : "notify-ring"),
    tts: (value) => (value <= 0 ? "tts-mute" : "tts"),
    system: (value) => (value <= 0 ? "system-mute" : "system")
  };

  const items = Object.entries(icons).map(([key, icon]) =>
    slider(
      `sound.${key}`,
      storage.get(`volume-${key}`, 100),
      0,
      (value) => storage.set(`volume-${key}`, value),
      icon
    )
  );

  const all = group(items[0].root);
  const channels = group(...items.slice(1).map((item) => item.root));

  const media = items[1];
  const notify = items[2];
  const voice = items[3];
  const system = items[4];

  const active = () =>
    [...document.querySelectorAll("audio, video")].some((media) => !media.paused && !media.ended);

  const cancel = () => {
    sound.halt("loop");
  };

  dom.on(media.input, "input", () => {
    if (!sound.playing("loop") && (sound.playing() || active())) {
      return;
    }

    sound.music("loop", { loop: true });
  });

  dom.on(notify.input, "input", () => {
    cancel();
    sound.play("bell", { channel: "notify", overlap: true });
  });

  dom.on(voice.input, "input", () => {
    cancel();
    tts.sync();

    if (!tts.busy() && Number(voice.input.value) > 0) {
      tts.speak(i18n.message("sound.preview"), { type: "cache" });
    }
  });

  dom.on(system.input, "input", () => {
    cancel();
    sound.play("pop", { channel: "system", overlap: true });
  });

  all.classList.add("toggle-content");
  channels.classList.add("toggle-content");

  const update = () => {
    const disabled = !on("sound");

    all.inert = disabled;
    channels.inert = disabled;

    items.forEach(({ input }) => {
      input.disabled = disabled;
    });
  };

  content.append(
    group(
      master("menu.sound", "sound", on("sound"), (value) => {
        const ok = setSound(value);

        update();

        return ok;
      })
    ),
    all,
    channels
  );

  update();

  try {
    return await open("menu.sound", content);
  } finally {
    sound.halt("loop");
  }
};

const blocked = () =>
  dialog({
    title: "menu.blocked",
    content: "menu.blockedInfo",
    direction: "→",
    actions: [{ text: "dialog.confirm", icon: "check", value: true }]
  });

const confirm = (title, content, run) =>
  dialog({
    title,
    content,
    direction: "→",
    actions: [
      { text: "dialog.cancel", icon: "close", value: false },
      { text: "dialog.confirm", icon: "check", run }
    ]
  });
const deviceIcon = (device) => (device === "desktop" ? "theme" : "phone");
const registration = async () => {
  if (!("serviceWorker" in navigator)) return null;

  return navigator.serviceWorker.getRegistration().catch(() => null);
};

const currentDevice = async (worker) => {
  const subscription = await worker?.pushManager?.getSubscription();

  if (!subscription) return null;

  if (Notification.permission !== "granted") {
    await api(routes.push, { method: "DELETE", data: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe().catch(() => false);

    return null;
  }

  const result = await push.refresh(subscription);

  if (result.status === 404) await subscription.unsubscribe().catch(() => false);

  return result.ok ? result.data : result.status === 404 ? null : undefined;
};

const deviceName = (device) => device.name || device.os || i18n.message("menu.unnamed");

const deviceSettings = (device, refresh) => {
  const content = node("div", "settings");
  const heading = node("div", "menu-device");
  const name = node("span");
  const info = node("div", "group");

  mark(heading, deviceIcon(device.device), true);
  name.textContent = deviceName(device);
  heading.append(name);
  info.append(
    label("profile.os", device.os || "—"),
    label("profile.browser", device.browser || "—")
  );

  content.append(heading, info);

  const path = `${routes.push}/devices/${device.id}`;
  const tools = toolbar([
    {
      icon: "edit",
      color: true,
      text: "menu.rename",
      run: () => {
        const field = node("div", "input");
        const input = node("input");

        input.value = deviceName(device);
        input.maxLength = 60;
        field.append(input);

        return dialog({
          title: "menu.rename",
          content: field,
          direction: "→",
          actions: [
            { text: "dialog.cancel", icon: "close", value: false },
            {
              text: "dialog.confirm",
              icon: "check",
              run: async () => {
                if (!input.value.trim()) return false;
                const result = await api(path, {
                  method: "PATCH",
                  data: { name: input.value.trim() }
                });

                if (!result.ok) {
                  fail();

                  return false;
                }

                device.name = input.value.trim();
                name.textContent = device.name;
                await refresh();

                return true;
              }
            }
          ]
        });
      }
    },
    ...["disconnect", "unregister"].map((action) => ({
      icon: action === "disconnect" ? "link" : "trash",
      color: true,
      text: `menu.${action}`,
      run: () =>
        confirm(`menu.${action}`, `menu.${action}Info`, async () => {
          const result = await api(path, {
            method: action === "disconnect" ? "PATCH" : "DELETE",
            data: action === "disconnect" ? { connected: false, active: false } : {}
          });

          if (!result.ok) {
            fail();

            return false;
          }

          await refresh();
          tools.querySelectorAll("button").forEach((button) => {
            button.disabled = true;
          });

          return true;
        })
    }))
  ]);

  return open("menu.deviceSettings", content, { toolbar: tools });
};

const notification = async () => {
  const worker = await registration();
  const status = await api(routes.push);
  const device = {
    worker,
    supported: push.supported(worker) && status.ok,
    value: await push.enabled(worker),
    save: async (value) => {
      if (value && Notification.permission === "denied") {
        await blocked();

        return false;
      }

      const active = await push.default(value, worker);

      if (active !== value) {
        if (value && Notification.permission === "denied") await blocked();

        return false;
      }

      if (value && !settings.read().web && !(await settings.save("web", true))) {
        await push.default(false, worker);

        return false;
      }

      device.value = value;

      return true;
    }
  };

  return device;
};

const notifications = async (device) => {
  const content = node("div", "settings");
  const loaded = await settings.load();
  const devices = node("div", "menu-devices");
  const registered = section("menu.devices", devices);
  const details = ["chat", "mention"].map((key) => {
    const item = field("switch", `menu.${key}`, key, settings.read()[key], (enabled) =>
      settings.save(key, enabled)
    );

    return item;
  });

  const pushControl = field("switch", "menu.web", "notify-ring", device.value, async (value) => {
    const ok = await device.save(value);

    await refresh();

    return ok;
  });

  const controls = group(
    ...details.map((item) => item.root),
    ...(device.supported ? [pushControl.root] : [])
  );

  controls.classList.add("toggle-content");

  const update = () => {
    controls.inert = !loaded || !settings.read().notification;

    details.forEach(({ input }) => {
      input.disabled = controls.inert;
    });

    pushControl.input.disabled = controls.inert || !device.supported;
  };

  const all = master("menu.notification", "notify", settings.read().notification, async (value) => {
    const ok = await settings.save("notification", value);

    update();

    return ok;
  });
  const input = dom.query("input", all);

  input.disabled = !loaded;

  const loading = progress({ type: "circular", value: 25, show: false });
  const retries = retry(
    () => refresh(),
    () => content.isConnected
  );

  let refreshing = false;

  async function refresh() {
    if (refreshing) return;

    refreshing = true;

    const current = await currentDevice(device.worker);
    const result = await api(`${routes.push}/devices`);

    refreshing = false;

    if (current !== undefined) device.value = Boolean(current?.active && current?.connected);

    pushControl.input.checked = device.value;
    update();
    registered.hidden = result.ok && !result.data.length;
    devices.replaceChildren();
    if (!result.ok) {
      devices.append(loading.element);
      retries.schedule();

      return;
    }

    retries.reset();
    if (!result.data.length) return;
    for (const device of result.data) {
      const item = node("div", "toggle menu-device-row");
      const head = node("div", "toggle-head");
      const button = node("button", "toggle-button");
      const title = node("span", "group-name");
      const gear = node("button", "toggle-switch toggle-action");

      button.type = gear.type = "button";
      mark(button, deviceIcon(device.device), true);
      mark(gear, "setting", true);

      title.textContent = deviceName(device);
      button.append(title);

      item.toggleAttribute("data-active", device.active && device.connected);

      dom.on(button, "click", async (event) => {
        event.stopPropagation();
        button.disabled = true;

        const result = await api(`${routes.push}/devices/${device.id}`, {
          method: "PATCH",
          data: { active: !(device.active && device.connected), connected: true }
        });

        if (!result.ok) fail();

        await refresh();
      });

      dom.on(gear, "click", () => deviceSettings(device, refresh));
      head.append(button, gear);
      item.append(head);
      devices.append(group(item));
    }
  }

  content.append(group(all), controls, registered);
  update();
  await refresh();
  try {
    return await open("menu.notification", content);
  } finally {
    retries.reset();
    loading.destroy();
  }
};

const data = async () => {
  const content = node("div", "settings");
  const value = await usage.sizeAll();

  content.append(
    group(
      ...["cookie", "data", "total"].map((key) => {
        const row = node("div", "label");
        const amount = node("span");

        amount.textContent = value[key];

        row.append(node("span", "", key === "total" ? "data.usage" : `data.${key}`), amount);

        return row;
      })
    )
  );

  return open("menu.data", content);
};

const contact = () => direct.contact();

export async function chatSettings(nested = false, roomId = "") {
  const content = node("div", "settings");
  const loaded = await settings.load();
  const response = roomId ? await rooms.read(roomId) : null;

  if (response && !response.ok) return fail();
  let current = response?.data;
  let dismiss;

  const handler = node("div", "group");

  dom.set(handler, "data-background", "");
  if (current?.contact) content.append(handler);

  const buttons = [
    ["sound", "direct.mute"],
    ["users", roomId ? "room.participants" : "online.open"],
    ...(roomId ? [["plus", "room.invite"]] : []),
    ["login", "direct.leave"]
  ].map(([icon, key]) => {
    const button = node("button", "icon-center");
    const label = node("span", "menu-label", key);

    button.type = "button";
    mark(button, icon);
    button.append(label);

    return button;
  });
  const shortcuts = group(...buttons);
  const exit = buttons.at(-1);
  const update = (value) => {
    const enabled = current ? !current.muted : value.chat;

    text(dom.query(".menu-label", buttons[0]), enabled ? "direct.mute" : "direct.unmute");
    mark(buttons[0], enabled ? "sound" : "volume-mute");
    exit.disabled = !current || current.closed || current.departed;
    exit.parentElement.hidden = !roomId;
    text(
      dom.query(".menu-label", exit),
      current?.contact ? "contact.end" : "direct.leave"
    );

    if (current?.contact) {
      handler.replaceChildren(
        label(
          "contact.handler",
          current.handler ? names.label(current.handler) : i18n.message("contact.waiting")
        )
      );
    }

    shortcuts.toggleAttribute("data-multiple", Boolean(current?.multiple && !current.contact));
    shortcuts.toggleAttribute("data-room", Boolean(roomId && !exit.parentElement.hidden));

    if (roomId) {
      const invite = buttons[2];

      invite.parentElement.hidden = !current.multiple || current.contact;
      invite.disabled =
        !current.multiple || !current.available || (!current.owner && !current.deputy);
    }
  };

  shortcuts.classList.add("chatting-menu");
  shortcuts.toggleAttribute("data-room", Boolean(roomId));
  dom.set(shortcuts, "data-view", "grid");
  buttons[0].disabled = !loaded;
  exit.disabled = true;
  dom.on(buttons[0], "click", async () => {
    buttons[0].disabled = true;
    try {
      let saved;

      if (current) {
        const result = await api(`${routes.chatting}/direct/message/${current.id}`, {
          method: "PATCH",
          data: { action: "mute", value: !current.muted }
        });

        saved = result.ok;
        if (saved) current.muted = !current.muted;
      } else saved = await settings.save("chat", !settings.read().chat);

      if (!saved) fail();
      else {
        caption({
          key: (current ? !current.muted : settings.read().chat) ? "menu.chatOn" : "menu.chatOff"
        });

        sound.play("pop", { channel: "system" });
        vibrate.play("response");
      }
    } finally {
      buttons[0].disabled = false;
      update(settings.read());
    }
  });

  dom.on(buttons[1], "click", () =>
    roomId ? rooms.participants(roomId, buttons[1]) : online(buttons[1])
  );

  if (roomId) dom.on(buttons[2], "click", () => rooms.select(roomId));

  dom.on(exit, "click", async () => {
    if (!current || !(await rooms.leave(roomId))) return;

    await dismiss?.("leave");
  });

  update(settings.read());

  if (!nested) content.append(shortcuts);

  if (!nested) {
    for (const [kind, icon] of [
      ["image", "image"],
      ["file", "download"],
      ["link", "link"]
    ]) {
      content.append(
        group(
          entry(`assets.${kind}`, icon, () => assets.default(kind, roomId)),
          assets.preview(kind, roomId)
        )
      );
    }
  }

  const management = group(
    entry("room.name", "edit", () => rooms.manage(roomId, "name")),
    entry("room.end", "logout", () => rooms.manage(roomId, "end"))
  );

  if (roomId) content.append(management);

  management.hidden = !current?.owner || current.closed;

  let active = true;
  let revision = 0;

  const changes = roomId
    ? dom.on(events(), "direct-state", async () => {
        const version = ++revision;
        const result = await rooms.read(roomId);

        if (!active || version !== revision || !result.ok) return;

        current = result.data;
        update(settings.read());
        management.hidden = !current.owner || current.closed;
      })
    : () => {};

  const controls = [
    ["whisper", "chatting.receiveWhisper", "whisper"],
    ["message", "chatting.receiveMessage", "mail"]
  ]
    .filter(() => !roomId)
    .map(([key, title, icon]) => {
      const control = field("switch", title, icon, settings.read()[key], (value) =>
        settings.save(key, value)
      );

      control.input.disabled = !loaded;

      return { key, ...control };
    });

  if (!loaded) fail();

  if (controls.length) {
    content.append(group(...controls.map((control) => control.root)));
  }

  const off = settings.subscribe((value) => {
    update(value);
    controls.forEach(({ key, input }) => (input.checked = value[key]));
  });

  try {
    return await open("menu.chatSettings", content, {
      title: nested ? "menu.chatSettings" : "menu.chatMenu",
      route: roomId ? undefined : nested ? ["settings-section", "chat"] : ["chat-settings", ""],
      ready: (_, close) => {
        dismiss = close;
      }
    });
  } finally {
    active = false;
    changes();
    off();
  }
}

export default async function menu(anchor) {
  await i18n.translate();

  const content = node("div", "settings menu");
  const loaded = await settings.load();
  const info = node("div", "label");
  const number = node("span");

  if (!loaded) fail();

  number.textContent = version;
  info.append(node("span", "", "menu.version"), number);

  const footer = group(info);

  dom.set(footer, "data-background", "");

  const device = await notification();
  const notice = master(
    "menu.notification",
    "notify",
    settings.read().notification,
    (value) => settings.save("notification", value),
    () => notifications(device),
    () => settings.read().notification
  );

  dom.query("input", notice).disabled = !loaded;

  content.append(
    group(
      entry("menu.language", "language", language, () => i18n.message(`language.${dom.root.lang}`)),
      entry("menu.theme", "theme", appearance, () =>
        i18n.message(`theme.${dom.get(dom.root, "data-theme")}`)
      )
    ),
    group(
      master("menu.sound", "sound", on("sound"), setSound, audio, () => on("sound")),
      notice
    ),
    group(
      entry("menu.data", "storage", data, async () => {
        const value = await usage.sizeAll().catch(() => null);

        return value ? value.total : i18n.message("menu.unavailable");
      }),
      entry("link.manage", "link", () => link.manage())
    ),
    group(
      entry("terms.title", "info", () => legal("terms")),
      entry("privacy.title", "cookie", () => legal("privacy")),
      entry("menu.contact", "mail", contact)
    ),
    footer
  );

  return popover({
    route: ["settings", ""],
    title: "menu.title",
    anchor,
    content,
    back: true,
    blur: true,
    direction: "→"
  });
}

route.register("settings", () => menu());
route.register("chat-settings", () => chatSettings(), "drawer");
route.register(
  "settings-section",
  async (section) => {
    const views = {
      language,
      chat: () => chatSettings(true),
      theme: appearance,
      sound: audio,
      notifications: async () => notifications(await notification()),
      data,
      contact
    };

    return views[section]?.();
  },
  "drawer"
);
