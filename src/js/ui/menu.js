import { on } from "#common/event";
import bindMenu from "#common/menu";
import { get, set } from "#common/storage";
import { show as showDialog, wait } from "#common/dialog";
import { size, clearCookie, clearData } from "#common/data";
import i18n from "#common/i18n";
import theme from "#common/theme";
import push, { enabled as pushEnabled } from "#common/push";

import { question } from "#ui/dialog";

const lightSheet = new CSSStyleSheet();

document.adoptedStyleSheets = [...document.adoptedStyleSheets, lightSheet];

const create = (name, className) => {
  const item = document.createElement(name);

  if (className) {
    item.className = className;
  }

  return item;
};

const translate = (name, key, className) => {
  const item = create(name, className);

  item.setAttribute("data-i18n", key);

  return item;
};

const icon = (name) => {
  const item = create("span", "menu-arrow");

  item.setAttribute("data-icon", name);

  return item;
};

const action = (name, back = false) => {
  const item = create("button");

  item.type = back ? "button" : "submit";

  item.setAttribute("data-circle", "");

  item.setAttribute("data-background", "");

  item.setAttribute("data-icon", name);

  if (back) {
    item.setAttribute("data-back", "");

    item.setAttribute("data-angle", "left");
  }

  return item;
};

const page = (name, key, root = false) => {
  const view = create("section", "menu-page");

  const head = create("header", "menu-head");

  const content = create("div", "menu-content");

  const title = translate("h2", key, "menu-title");

  view.setAttribute("data-page", name);

  view.hidden = !root;

  if (root) {
    head.append(title, action("close"));
  } else {
    head.append(action("arrow", true), title);
  }

  view.append(head, content);

  return { content, view };
};

const item = (name, iconName, value) => {
  const button = create("button", "menu-item");

  button.type = "button";

  button.setAttribute("data-background", "");

  button.setAttribute("data-icon", iconName);

  button.setAttribute("data-open", name);

  button.append(translate("span", `menu.${name}`, "menu-item-title"));

  if (value) {
    value.classList.add("menu-item-value");

    button.append(value);
  }

  button.append(icon("arrow"));

  return button;
};

const group = (...items) => {
  const view = create("div", "menu-group");

  view.append(...items);

  return view;
};

const horizontal = (...items) => {
  const view = group(...items);

  view.setAttribute("data-horizontal", "");

  return view;
};

const vertical = (item) => {
  item.setAttribute("data-vertical", "");

  return item;
};

const background = (item) => {
  item.setAttribute("data-background", "");

  return item;
};

const value = (keys) => {
  const output = create("output");

  const entries = Object.fromEntries(
    Object.entries(keys).map(([name, key]) => {
      const text = translate("span", key);

      text.hidden = true;

      return [name, text];
    })
  );

  output.append(...Object.values(entries));

  return {
    output,

    set(name) {
      Object.entries(entries).forEach(([key, text]) => {
        text.hidden = key !== name;
      });
    }
  };
};

const usage = (name, iconName, key, output) => {
  const button = create("button", "menu-item");

  button.type = "button";

  button.setAttribute("data-background", "");

  button.setAttribute("data-delete", name);

  button.setAttribute("data-icon", iconName);

  button.append(translate("span", key, "menu-item-title"), output);

  output.className = "menu-item-value";

  return button;
};

const choice = (type, name, value, key, iconName) => {
  const view = create("div", `${type} menu-option`);

  const label = create("label");

  const input = create("input");

  const text = translate("span", key);

  input.type = type === "radio" ? "radio" : "checkbox";

  input.name = name;
  input.value = value;

  if (iconName) {
    label.setAttribute("data-icon", iconName);
  }

  label.append(text, input);

  view.append(label);

  return { icon: label, input, view };
};

const slider = (
  name,
  key,
  { min = 0, max = 100, icon: iconName = "volume-high" } = {}
) => {
  const view = create("div", "range menu-range");

  const label = create("label");

  const control = create("div", "range-control");

  const track = create("span", "range-track");

  const fill = create("span", "range-fill");

  const thumb = create("span", "range-thumb");

  const input = create("input");

  const output = create("output");

  input.className = "range-input";

  input.type = "range";
  input.name = name;
  input.min = String(min);
  input.max = String(max);
  input.step = "1";
  input.value = "100";
  output.value = "100%";

  label.setAttribute("data-icon", iconName);

  const release = () => {
    view.removeAttribute("data-drag");
  };

  input.addEventListener("pointerdown", () => {
    view.setAttribute("data-drag", "");
  });

  ["pointerup", "pointercancel", "lostpointercapture", "blur"].forEach((type) =>
    input.addEventListener(type, release)
  );

  label.append(translate("span", key), output);

  track.append(fill);

  control.append(track, thumb, input);

  view.append(label, control);

  return { icon: label, input, output, view };
};

const wrapper = create("div");

const button = create("button", "menu");

const view = create("dialog", "menu");

const form = create("form", "menu-panel");

const rootPage = page("root", "menu.title", true);

const noticePage = page("notification", "menu.notification");

const dataPage = page("data", "menu.data");

const soundPage = page("sound", "menu.sound");

const languagePage = page("language", "menu.language");

const themePage = page("theme", "menu.theme");

const notificationControl = choice(
  "switch",
  "notification",
  "true",
  "notification.enabled",
  "notification"
);

const pushControl = choice(
  "switch",
  "push",
  "true",
  "notification.push",
  "notification"
);

const soundControl = choice(
  "switch",
  "sound",
  "true",
  "sound.enabled",
  "sound"
);

const vibrationControl = choice(
  "switch",
  "vibration",
  "true",
  "sound.vibration",
  "vibration"
);

const channels = ["master", "media", "notify", "tts", "system"];

const volumeControls = Object.fromEntries(
  channels.map((name) => [
    name,
    slider(`volume-${name}`, `sound.${name}`, {
      icon:
        name === "notify"
          ? "notification"
          : ["tts", "system"].includes(name)
            ? name
            : "volume-high"
    })
  ])
);

const brightnessControl = slider("brightness", "theme.brightness", {
  min: 20,
  icon: "light"
});

brightnessControl.view.setAttribute("data-brightness", "");

const cookieDialog = question("cookie.delete");

const dataDialog = question("data.delete");

const brightness = brightnessControl.input;

const brightnessText = brightnessControl.output;

const storage = create("output");

const cookieSize = create("output");

const dataSize = create("output");

const notificationValue = value({ on: "state.on", off: "state.off" });

const languageValue = value({ system: "language.system", ko: "language.ko" });

const themeValue = value({
  system: "theme.system",
  light: "theme.light",
  dark: "theme.dark"
});

const notification = notificationControl.input;

const notice = pushControl.input;

const sound = soundControl.input;

const vibration = vibrationControl.input;

storage.value = "0B";
cookieSize.value = "0B";
dataSize.value = "0B";

button.type = "button";

button.setAttribute("data-background", "");

button.setAttribute("data-circle", "");

button.setAttribute("data-icon", "menu");

notificationControl.view.setAttribute("data-background", "");

pushControl.view.setAttribute("data-background", "");

soundControl.view.setAttribute("data-opacity", "");

vibrationControl.view.setAttribute("data-opacity", "");

rootPage.content.append(
  group(
    item("notification", "notification", notificationValue.output),
    item("data", "storage", storage),
    item("sound", "sound"),
    item("language", "language", languageValue.output),
    item("theme", "theme", themeValue.output)
  )
);

const noticeOptions = group(pushControl.view);

noticePage.content.append(group(notificationControl.view), noticeOptions);

dataPage.content.append(
  translate("h3", "data.usage", "menu-group-title"),
  group(
    usage("cookie", "cookie", "data.cookie", cookieSize),
    usage("data", "storage", "data.data", dataSize)
  )
);

soundPage.content.append(
  horizontal(vertical(soundControl.view), vertical(vibrationControl.view)),
  group(...channels.map((name) => volumeControls[name].view))
);

languagePage.content.append(
  group(
    background(
      choice("checkbox", "language", "system", "language.system", "setting")
        .view
    ),
    background(
      choice("checkbox", "language", "ko", "language.ko", "language").view
    )
  )
);

themePage.content.append(
  horizontal(
    vertical(
      choice("radio", "theme", "system", "theme.system", "setting").view
    ),
    vertical(choice("radio", "theme", "light", "theme.light", "light").view),
    vertical(choice("radio", "theme", "dark", "theme.dark", "dark").view)
  ),
  group(brightnessControl.view)
);

form.method = "dialog";

form.append(
  rootPage.view,
  noticePage.view,
  dataPage.view,
  soundPage.view,
  languagePage.view,
  themePage.view
);

view.append(form);

wrapper.append(button, view);

document.querySelector(".app").append(wrapper);

const menu = bindMenu(view, { trigger: button });

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

const paint = ({ input, view }) => {
  const min = Number(input.min) || 0;

  const max = Number(input.max) || 100;

  const value = clamp(input.value, min, max);

  const percent = ((value - min) / (max - min)) * 100;

  view.querySelector(".range-fill").style.width = `${percent}%`;

  view.querySelector(".range-thumb").style.insetInlineStart = `${percent}%`;
};

const iconFor = (name, value) => {
  if (["master", "media"].includes(name)) {
    return value <= 0
      ? "volume-mute"
      : value <= 50
        ? "volume-low"
        : "volume-high";
  }

  const icon = { notify: "notification", tts: "tts", system: "system" }[name];

  return value <= 0 ? `${icon}-mute` : icon;
};

const volumes = Object.fromEntries(
  channels.map((name) => [
    name,
    clamp(get(`volume-${name}`, name === "master" ? get("volume", 100) : 100))
  ])
);

let light = clamp(get("brightness", 100), 20);

let registration;
let loaded = false;

const applyVolume = (name) => {
  const control = volumeControls[name];

  const value = volumes[name];

  control.input.value = String(value);

  control.output.value = `${value}%`;

  control.icon.setAttribute("data-icon", iconFor(name, value));

  paint(control);
};

const applySound = () => {
  channels.forEach(applyVolume);

  soundControl.icon.setAttribute(
    "data-icon",
    sound.checked ? "sound" : "volume-mute"
  );
};

const applyBrightness = () => {
  const scale = 0.08 + ((light - 20) / 80) * 0.92;

  lightSheet.replaceSync(`
    html,
    dialog {
      filter: brightness(${light}%);
    }
  `);

  brightness.value = String(light);

  brightnessText.value = `${light}%`;

  brightnessControl.view.style.setProperty("--light-scale", scale);

  paint(brightnessControl);
};

const syncNotification = () => {
  const enabled = notification.checked;

  notificationValue.set(enabled ? "on" : "off");

  notificationControl.icon.setAttribute(
    "data-icon",
    enabled ? "notification" : "notification-mute"
  );

  [...noticePage.content.querySelectorAll(".menu-group")]
    .slice(1)
    .forEach((group) => {
      group.querySelectorAll("input, button").forEach((item) => {
        item.disabled = !enabled || !registration;
      });
    });
};

const update = async () => {
  const value = await size();

  storage.value = value.total;
  cookieSize.value = value.cookie;
  dataSize.value = value.data;
};

notification.checked = get("notification", "true") !== "false";

sound.checked = get("sound", "true") !== "false";

vibration.checked = get("vibration", "true") !== "false";

languageValue.set(get("lang", "system"));

themeValue.set(get("theme", "system"));

vibrationControl.icon.setAttribute(
  "data-icon",
  vibration.checked ? "vibration" : "vibration-off"
);

applySound();
applyBrightness();
syncNotification();

export default async function load(service) {
  registration = service;

  notice.checked = await pushEnabled(registration);

  pushControl.icon.setAttribute(
    "data-icon",
    notice.checked ? "notification" : "notification-mute"
  );

  if (!notification.checked && notice.checked) {
    notice.checked = await push(false, registration);
  }

  syncNotification();

  if (loaded) {
    return;
  }

  on(button, "click", () => {
    const selected = (name, value) => {
      view.querySelectorAll(`[name="${name}"]`).forEach((option) => {
        option.checked = option.value === value;
      });
    };

    selected("theme", get("theme", "system"));

    selected("language", get("lang", "system"));

    themeValue.set(get("theme", "system"));

    languageValue.set(get("lang", "system"));

    update().catch(() => {});

    menu.open();
  });

  on(view, "click", async (event) => {
    const target = event.target.closest("button");

    const remove = target?.getAttribute("data-delete");

    if (!remove) {
      return;
    }

    const dialog = remove === "cookie" ? cookieDialog : dataDialog;

    const clear = remove === "cookie" ? clearCookie : clearData;

    if (!showDialog(dialog)) {
      return;
    }

    if ((await wait(dialog)) !== "confirm" || !(await clear())) {
      return;
    }

    if (remove === "data") {
      location.reload();
    } else {
      await update();
    }
  });

  on(view, "input", (event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    if (event.target.name.startsWith("volume-")) {
      const name = event.target.name.slice(7);

      volumes[name] = clamp(event.target.value);

      set(`volume-${name}`, volumes[name]);

      applyVolume(name);
    }

    if (event.target.name === "brightness") {
      light = clamp(event.target.value, 20);

      set("brightness", light);

      applyBrightness();
    }
  });

  on(view, "change", async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.name === "notification") {
      set("notification", target.checked);

      if (!target.checked && notice.checked) {
        target.disabled = true;

        notice.checked = await push(false, registration);

        target.disabled = false;
      }

      pushControl.icon.setAttribute(
        "data-icon",
        notice.checked ? "notification" : "notification-mute"
      );

      syncNotification();

      return;
    }

    if (target.name === "push") {
      target.disabled = true;

      target.checked = await push(target.checked, registration);

      pushControl.icon.setAttribute(
        "data-icon",
        target.checked ? "notification" : "notification-mute"
      );

      syncNotification();

      return;
    }

    if (target.name === "sound") {
      set("sound", target.checked);

      applySound();

      return;
    }

    if (target.name === "vibration") {
      set("vibration", target.checked);

      vibrationControl.icon.setAttribute(
        "data-icon",
        target.checked ? "vibration" : "vibration-off"
      );

      return;
    }

    if (target.name === "theme") {
      theme(target.value);

      themeValue.set(target.value);
    }

    if (target.name === "language") {
      if (!target.checked) {
        target.checked = true;

        return;
      }

      view.querySelectorAll('[name="language"]').forEach((option) => {
        option.checked = option === target;
      });

      await i18n(target.value);

      languageValue.set(target.value);
    }
  });

  loaded = true;
}
