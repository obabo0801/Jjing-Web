import { all } from "#common/query";

const attributes = {
  arrow: [
    "m9 18 6-6-6-6"
  ]
};

const extensions = [
  "avif", "gif", "ico", "jpeg",
  "jpg", "png", "svg", "webp"
];

const positions = {
  left: "left", "←": "left",
  right: "right", "→": "right",
  top: "top", "↑": "top",
  "top-left": "top-left",
  "↖": "top-left",
  "top-right": "top-right",
  "↗": "top-right",
  bottom: "bottom", "↓": "bottom",
  "bottom-left": "bottom-left",
  "↙": "bottom-left",
  "bottom-right": "bottom-right",
  "↘": "bottom-right",
  center: "center"
};

const angles = {
  right: 0, bottom: 90,
  left: 180, top: -90
};

const image = (value) => {
  const path = value
    .split(/[?#]/)[0]
    .toLowerCase();

  return extensions.some((file) =>
    path.endsWith(`.${file}`)
  );
};

const svg = (paths) => {
  const icon = document.createElementNS(
    "http://www.w3.org/2000/svg", "svg"
  );

  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.classList.add("icon");

  paths.forEach((data) => {
    const path = document.createElementNS(
      "http://www.w3.org/2000/svg", "path"
    );

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
  element.querySelector(":scope > .icon")
    ?.remove();

  element.classList.remove(
    "icon-left", "icon-right",
    "icon-top", "icon-bottom",
    "icon-center"
  );

  const value = element.getAttribute("data-icon")
    ?.trim();

  if (!value) {
    return;
  }

  const parts = value.split(/\s+/);
  const last = parts.at(-1);

  const place = Object.hasOwn(positions, last)
    ? positions[parts.pop()]
    : "left";

  const name = parts.join(" ");

  element.classList.add(
    ...place.split("-").map((position) =>
      `icon-${position}`
    )
  );

  const icon = Object.hasOwn(attributes, name)
    ? svg(attributes[name])
    : image(name)
      ? img(name)
      : text(name);

  const angle = element.getAttribute("data-angle")
    ?.trim()
    .toLowerCase();

  const degree = Object.hasOwn(angles, angle)
    ? angles[angle]
    : Number(angle);

  if (Number.isFinite(degree)) {
    icon.style.setProperty(
      "--icon-angle", `${degree}deg`
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

  const observer = new MutationObserver(
    (records) => {
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
    }
  );

  observer.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ["data-icon", "data-angle"]
  });

  loaded = true;
}
