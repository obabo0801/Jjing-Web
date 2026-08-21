import { all } from "#common/query";

const attributes = {
  arrow: ["m9 18 6-6-6-6"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  dark: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"],
  cookie: [
    "M21 12a9 9 0 1 1-9-9",
    "M21 12a3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3",
    "M8.5 8.5h.01",
    "M8 15h.01",
    "M15 15h.01"
  ],
  language: [
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
    "M2 12h20",
    "M12 2a15 15 0 0 1 0 20",
    "M12 2a15 15 0 0 0 0 20"
  ],
  light: [
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M12 2v2",
    "M12 20v2",
    "M2 12h2",
    "M20 12h2",
    "M4.93 4.93l1.42 1.42",
    "M17.66 17.66l1.41 1.41",
    "M4.93 19.07l1.42-1.42",
    "M17.66 6.34l1.41-1.41"
  ],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  notification: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  "notification-mute": [
    "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9",
    "M10 21h4",
    "M3 3l18 18"
  ],
  setting: [
    "M12.22 2h-.44a2 2 0 0 0-2 2v.18" +
      "a2 2 0 0 1-1 1.73l-.43.25" +
      "a2 2 0 0 1-2 0l-.15-.08" +
      "a2 2 0 0 0-2.73.73l-.22.38" +
      "a2 2 0 0 0 .73 2.73l.15.1" +
      "a2 2 0 0 1 1 1.72v.51" +
      "a2 2 0 0 1-1 1.74l-.15.09" +
      "a2 2 0 0 0-.73 2.73l.22.38" +
      "a2 2 0 0 0 2.73.73l.15-.08" +
      "a2 2 0 0 1 2 0l.43.25" +
      "a2 2 0 0 1 1 1.73V20" +
      "a2 2 0 0 0 2 2h.44" +
      "a2 2 0 0 0 2-2v-.18" +
      "a2 2 0 0 1 1-1.73l.43-.25" +
      "a2 2 0 0 1 2 0l.15.08" +
      "a2 2 0 0 0 2.73-.73l.22-.38" +
      "a2 2 0 0 0-.73-2.73l-.15-.09" +
      "a2 2 0 0 1-1-1.74v-.51" +
      "a2 2 0 0 1 1-1.74l.15-.09" +
      "a2 2 0 0 0 .73-2.73l-.22-.38" +
      "a2 2 0 0 0-2.73-.73l-.15.08" +
      "a2 2 0 0 1-2 0l-.43-.25" +
      "a2 2 0 0 1-1-1.73V4" +
      "a2 2 0 0 0-2-2Z",
    "M12 15a3 3 0 1 0 0-6" + " 3 3 0 0 0 0 6Z"
  ],
  search: [
    "M21 21l-4.35-4.35",
    "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z"
  ],
  voice: [
    "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z",
    "M19 10v2a7 7 0 0 1-14 0v-2",
    "M12 19v3",
    "M8 22h8"
  ],
  wave: ["M4 10v4", "M8 7v10", "M12 4v16", "M16 7v10", "M20 10v4"],
  storage: [
    "M4 6c0-1.1 3.58-2 8-2s8 .9 8 2-3.58 2-8 2-8-.9-8-2Z",
    "M4 6v6c0 1.1 3.58 2 8 2s8-.9 8-2V6",
    "M4 12v6c0 1.1 3.58 2 8 2s8-.9 8-2v-6"
  ],
  sound: [
    "M11 5 6 9H2v6h4l5 4Z",
    "M15.54 8.46a5 5 0 0 1 0 7.07",
    "M18.36 5.64a9 9 0 0 1 0 12.73"
  ],
  system: [
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z"
  ],
  "system-mute": [
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z",
    "M3 3l18 18"
  ],
  theme: ["M4 5h16v12H4z", "M8 21h8", "M12 17v4"],
  tts: [
    "M6 4h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z",
    "M8 9h8",
    "M8 12h6"
  ],
  "tts-mute": [
    "M6 4h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z",
    "M8 9h8",
    "M8 12h6",
    "M3 3l18 18"
  ],
  vibration: ["M8 6h8v12H8z", "M4 8v8", "M1 10v4", "M20 8v8", "M23 10v4"],
  "vibration-off": ["M8 6h8v12H8z"],
  "volume-high": [
    "M11 5 6 9H2v6h4l5 4Z",
    "M15.54 8.46a5 5 0 0 1 0 7.07",
    "M18.36 5.64a9 9 0 0 1 0 12.73"
  ],
  "volume-low": ["M11 5 6 9H2v6h4l5 4Z", "M15.54 8.46a5 5 0 0 1 0 7.07"],
  "volume-mute": ["M11 5 6 9H2v6h4l5 4Z", "M2 6 15 18"]
};

const extensions = ["avif", "gif", "ico", "jpeg", "jpg", "png", "svg", "webp"];

const positions = {
  left: "left",
  "←": "left",
  right: "right",
  "→": "right",
  top: "top",
  "↑": "top",
  "top-left": "top-left",
  "↖": "top-left",
  "top-right": "top-right",
  "↗": "top-right",
  bottom: "bottom",
  "↓": "bottom",
  "bottom-left": "bottom-left",
  "↙": "bottom-left",
  "bottom-right": "bottom-right",
  "↘": "bottom-right",
  center: "center"
};

const angles = { right: 0, bottom: 90, left: 180, top: -90 };

const image = (value) => {
  const path = value.split(/[?#]/)[0].toLowerCase();

  return extensions.some((file) => path.endsWith(`.${file}`));
};

const svg = (paths) => {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  icon.setAttribute("viewBox", "0 0 24 24");
  icon.classList.add("icon");

  paths.forEach((data) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    path.setAttribute("d", data);

    icon.append(path);
  });

  return icon;
};

const img = (source) => {
  const icon = document.createElement("img");

  icon.src = source;
  icon.alt = "";
  icon.classList.add("icon");

  return icon;
};

const text = (value) => {
  const icon = document.createElement("span");

  icon.textContent = value;
  icon.classList.add("icon", "icon-text");

  return icon;
};

const set = (element) => {
  element.querySelector(":scope > .icon")?.remove();

  element.classList.remove(
    "icon-left",
    "icon-right",
    "icon-top",
    "icon-bottom",
    "icon-center"
  );

  const value = element.getAttribute("data-icon")?.trim();

  if (!value) {
    return;
  }

  const parts = value.split(/\s+/);
  const last = parts.at(-1);

  const place = Object.hasOwn(positions, last) ? positions[parts.pop()] : null;

  const name = parts.join(" ");

  if (place) {
    element.classList.add(
      ...place.split("-").map((position) => `icon-${position}`)
    );
  }

  const icon = Object.hasOwn(attributes, name)
    ? svg(attributes[name])
    : image(name)
      ? img(name)
      : text(name);

  const angle = element.getAttribute("data-angle")?.trim().toLowerCase();

  const degree = Object.hasOwn(angles, angle) ? angles[angle] : Number(angle);

  if (Number.isFinite(degree)) {
    icon.animate(
      { transform: `rotate(${degree}deg)` },
      { duration: 0, fill: "forwards" }
    );
  }

  element.prepend(icon);
};

const scan = (root = document) => {
  if (root.matches?.("[data-icon]")) {
    set(root);
  }

  all("[data-icon]", root).forEach(set);
};

let loaded = false;

export default function icon() {
  scan();

  if (loaded) {
    return;
  }

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "attributes") {
        set(record.target);

        return;
      }

      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scan(node);
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-icon", "data-angle"]
  });

  loaded = true;
}
