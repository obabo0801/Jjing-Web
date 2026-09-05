import * as dom from "#common/dom";

const icons = {
  arrow: ["m9 18 6-6-6-6"],
  phone: [
    "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z",
    "M10 5h4",
    "M12 18h.01"
  ],
  camera: [
    "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9" +
      "a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9" +
      "a2 2 0 0 0-2-2h-3.5Z",
    "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
  ],
  edit: [
    "M12 20h9",
    "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
  ],
  home: [
    "M3 11 12 3l9 8",
    "M5 10v10h14V10",
    "M9 20v-6h6v6"
  ],
  reload: ["M20 11a8 8 0 1 0-2.34 5.66", "M20 4v7h-7"],
  rotate: [
    "M21 12a9 9 0 0 0-15.5-6.2L3 8",
    "M3 3v5h5",
    "M3 12a9 9 0 0 0 15.5 6.2L21 16",
    "M21 21v-5h-5"
  ],
  close: ["M18 6 6 18", "m6 6 12 12"],
  copy: ["M8 8h12v12H8z", "M4 16V4h12"],
  error: [
    "M21 12a9 9 0 1 1-18 0" + " 9 9 0 0 1 18 0Z",
    "M12 8v5",
    "M12 17h.01"
  ],
  "eye-off": [
    "m3 3 18 18",
    "M10.6 10.6a2 2 0 0 0 2.8 2.8",
    "M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9 4 10 8",
    "M6.2 6.2A12 12 0 0 0 2 12c1 4 5 8 10 8"
  ],
  warning: [
    "M21.73 18l-8-14" +
      "a2 2 0 0 0-3.46 0" +
      "l-8 14A2 2 0 0 0 4 21h16" +
      "a2 2 0 0 0 1.73-3Z",
    "M12 9v4",
    "M12 17h.01"
  ],
  info: [
    "M21 12a9 9 0 1 1-18 0" + " 9 9 0 0 1 18 0Z",
    "M12 11v5",
    "M12 8h.01"
  ],
  image: [
    "M3 5h18v14H3Z",
    "M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
    "m3 17 5-5 4 4 3-3 6 6"
  ],
  delete: [
    "M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z",
    "m10 9 6 6",
    "m16 9-6 6"
  ],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
  flag: ["M5 22V4", "M5 4h12l-2 4 2 4H5"],
  gift: [
    "M20 12v10H4V12",
    "M2 7h20v5H2z",
    "M12 7v15",
    "M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Z",
    "M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z"
  ],
  check: ["M20 6 9 17l-5-5"],
  dark: ["M12 3a6 6 0 0 0 9 9" + " 9 9 0 1 1-9-9Z"],
  cookie: [
    "M21 12a9 9 0 1 1-9-9",
    "M21 12a3 3 0 0 1-3-3 " +
      "3 3 0 0 1-3-3 " +
      "3 3 0 0 1-3-3",
    "M8.5 8.5h.01",
    "M8 15h.01",
    "M15 15h.01"
  ],
  language: [
    "M12 22a10 10 0 1 0 0-20" + " 10 10 0 0 0 0 20Z",
    "M2 12h20",
    "M12 2a15 15 0 0 1 0 20",
    "M12 2a15 15 0 0 0 0 20"
  ],
  link: [
    "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2",
    "M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"
  ],
  mail: [
    "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    "m22 6-10 7L2 6"
  ],
  light: [
    "M12 16a4 4 0 1 0 0-8" + " 4 4 0 0 0 0 8Z",
    "M12 2v2",
    "M12 20v2",
    "M2 12h2",
    "M20 12h2",
    "M4.93 4.93l1.42 1.42",
    "M17.66 17.66l1.41 1.41",
    "M4.93 19.07l1.42-1.42",
    "M17.66 6.34l1.41-1.41"
  ],
  minus: ["M5 12h14"],
  plus: ["M5 12h14", "M12 5v14"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  notify: [
    "M18 8a6 6 0 0 0-12 0" +
      "c0 7-3 7-3 9h18" +
      "c0-2-3-2-3-9",
    "M10 21h4"
  ],
  "notify-mute": [
    "M18 8a6 6 0 0 0-12 0" +
      "c0 7-3 7-3 9h18" +
      "c0-2-3-2-3-9",
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
    "M10.5 18a7.5 7.5 0 1 0 0-15" + " 7.5 7.5 0 0 0 0 15Z"
  ],
  send: ["M22 2 15 22l-4-9-9-4Z", "M22 2 11 13"],
  voice: [
    "M12 2a3 3 0 0 0-3 3v7" +
      "a3 3 0 0 0 6 0V5" +
      "a3 3 0 0 0-3-3Z",
    "M19 10v2a7 7 0 0 1-14 0v-2",
    "M12 19v3",
    "M8 22h8"
  ],
  whisper: [
    "M6 8.5a6.5 6.5 0 1 1 13 0" +
      "c0 6-3 6-3 8.5a3.5 3.5 0 0 1-7 0",
    "M15 8.5a2.5 2.5 0 0 0-5 0v1" + "a2 2 0 0 0 2 2h1"
  ],
  wave: [
    "M4 10v4",
    "M8 7v10",
    "M12 4v16",
    "M16 7v10",
    "M20 10v4"
  ],
  storage: [
    "M4 6c0-1.1 3.58-2 8-2" +
      "s8 .9 8 2-3.58 2-8 2" +
      "-8-.9-8-2Z",
    "M4 6v6" + "c0 1.1 3.58 2 8 2" + "s8-.9 8-2V6",
    "M4 12v6" + "c0 1.1 3.58 2 8 2" + "s8-.9 8-2v-6"
  ],
  sound: [
    "M11 5 6 9H2v6h4l5 4Z",
    "M15.54 8.46a5 5 0 0 1 0 7.07",
    "M18.36 5.64a9 9 0 0 1 0 12.73"
  ],
  system: [
    "M14.7 6.3a1 1 0 0 0 0 1.4" +
      "l1.6 1.6a1 1 0 0 0 1.4 0" +
      "l3.77-3.77a6 6 0 0 1-7.94 7.94" +
      "l-6.91 6.91a2.12 2.12 0 0 1-3-3" +
      "l6.91-6.91a6 6 0 0 1 7.94-7.94Z"
  ],
  "system-mute": [
    "M14.7 6.3a1 1 0 0 0 0 1.4" +
      "l1.6 1.6a1 1 0 0 0 1.4 0" +
      "l3.77-3.77a6 6 0 0 1-7.94 7.94" +
      "l-6.91 6.91a2.12 2.12 0 0 1-3-3" +
      "l6.91-6.91a6 6 0 0 1 7.94-7.94Z",
    "M3 3l18 18"
  ],
  theme: ["M4 5h16v12H4z", "M8 21h8", "M12 17v4"],
  throbber: ["M21 12a9 9 0 1 1-9-9"],
  tts: [
    "M6 4h12a3 3 0 0 1 3 3v7" +
      "a3 3 0 0 1-3 3h-5l-5 3v-3H6" +
      "a3 3 0 0 1-3-3V7" +
      "a3 3 0 0 1 3-3Z",
    "M8 9h8",
    "M8 12h6"
  ],
  "tts-mute": [
    "M6 4h12a3 3 0 0 1 3 3v7" +
      "a3 3 0 0 1-3 3h-5l-5 3v-3H6" +
      "a3 3 0 0 1-3-3V7" +
      "a3 3 0 0 1 3-3Z",
    "M8 9h8",
    "M8 12h6",
    "M3 3l18 18"
  ],
  user: [
    "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
    "M4 22v-2a8 8 0 0 1 16 0v2Z"
  ],
  vibration: [
    "M8 6h8v12H8z",
    "M4 8v8",
    "M1 10v4",
    "M20 8v8",
    "M23 10v4"
  ],
  "vibration-off": ["M8 6h8v12H8z"],
  "volume-high": [
    "M11 5 6 9H2v6h4l5 4Z",
    "M15.54 8.46a5 5 0 0 1 0 7.07",
    "M18.36 5.64a9 9 0 0 1 0 12.73"
  ],
  "volume-low": [
    "M11 5 6 9H2v6h4l5 4Z",
    "M15.54 8.46a5 5 0 0 1 0 7.07"
  ],
  "volume-mute": ["M11 5 6 9H2v6h4l5 4Z", "M2 6 15 18"]
};

const extensions = [
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp"
];

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

const angles = {
  right: 0,
  bottom: 90,
  left: 180,
  top: -90
};

const isImage = (value) => {
  const path = value.split(/[?#]/)[0].toLowerCase();

  return extensions.some((extension) =>
    path.endsWith(`.${extension}`)
  );
};

const svg = (paths) => {
  const icon = dom.svg("svg");

  dom.set(icon, "viewBox", "0 0 24 24");
  icon.classList.add("icon");
  paths.forEach((data) => {
    const path = dom.svg("path");

    dom.set(path, "d", data);
    icon.append(path);
  });

  return icon;
};

const img = (source, element) => {
  const icon = dom.create("img");

  icon.src = source;
  icon.alt = "";
  icon.classList.add("icon");

  dom.on(
    icon,
    "error",
    () => {
      const value = dom
        .get(element, "data-default")
        ?.trim();

      if (value && value !== source) {
        dom.set(element, "data-icon", value);
      }
    },
    { once: true }
  );

  return icon;
};

const text = (value) => {
  const icon = dom.create("span");

  icon.textContent = value;
  icon.classList.add("icon", "icon-text");

  return icon;
};

const render = (element) => {
  dom.query(":scope > .icon", element)?.remove();
  element.classList.remove(
    "icon-left",
    "icon-right",
    "icon-top",
    "icon-bottom",
    "icon-center"
  );

  const value = dom.get(element, "data-icon")?.trim();

  if (!value) {
    return;
  }

  const parts = value.split(/\s+/);
  const last = parts.at(-1);
  const position = Object.hasOwn(positions, last)
    ? positions[last]
    : null;

  if (position) {
    parts.pop();
    const classes = position
      .split("-")
      .map((value) => `icon-${value}`);

    element.classList.add(...classes);
  }

  const name = parts.join(" ");

  if (!name) {
    return;
  }

  const icon = Object.hasOwn(icons, name)
    ? svg(icons[name])
    : isImage(name)
      ? img(name, element)
      : text(name);

  const angle = dom
    .get(element, "data-angle")
    ?.trim()
    .toLowerCase();

  const degree = Object.hasOwn(angles, angle)
    ? angles[angle]
    : Number(angle);

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
    render(root);
  }

  dom.all("[data-icon]", root).forEach(render);
};

let observing = false;

export default function icon() {
  scan();

  if (observing) {
    return;
  }

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "attributes") {
        render(record.target);
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
  observing = true;
}
