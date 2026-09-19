const user = "([a-f0-9]{32})";
const image = [
  "[a-f0-9]{32}",
  "icon-(?:192|512)",
  "giphy-[a-zA-Z0-9]{1,80}",
  "ogq-[a-f0-9]{8,32}-[0-9]{1,4}-(?:80|160|240)-(?:png|webp)"
].join("|");

const routes = [
  ["login", "popover", "/login"],
  ["terms", "drawer", "/terms"],
  ["privacy", "drawer", "/privacy"],
  ["settings", "popover", "/settings"],
  ["admin", "popover", "/admin"],
  ["chat-settings", "drawer", "/chat/settings"],
  ["inbox", "drawer", "/messages"],
  ["room", "drawer", "/rooms/([a-f0-9-]{36})"],
  ["message", "drawer", `/messages/${user}`],
  [
    "settings-section",
    "drawer",
    "/settings/(language|theme|sound|notifications|chat|data|contact)"
  ],
  ["online", "popover", "/online"],
  ["profile", "popover", `/profile/${user}`],
  ["image", "popover", `/image/(${image})`],
  ["history-chatting", "drawer", `/profile/${user}/messages`],
  ["history-sanction", "drawer", `/profile/${user}/sanctions`],
  ["reports", "drawer", `/profile/${user}/reports`],
  ["reports", "drawer", "/reports"],
  ["authority", "drawer", `/profile/${user}/permissions`],
  ["select", "popover", "/preferences/([a-zA-Z0-9_-]{1,80})"]
].map(([name, type, path]) => ({ name, type, pattern: new RegExp(`^${path}/?$`) }));

export const read = (value) => {
  const url = new globalThis.URL(value, "http://localhost");

  for (const { name, type, pattern } of routes) {
    const match = pattern.exec(url.pathname);

    if (!match) continue;

    return [type, name, match[1] || ""];
  }

  return null;
};

export const page = (value) => {
  const state = read(value);

  return state ? (["admin", "reports"].includes(state[1]) && !state[2] ? "admin" : "index") : "";
};

export const href = ([, name, id]) => {
  if (name === "login") return "/login";

  if (name === "terms" || name === "privacy") return `/${name}`;

  if (name === "settings") return "/settings";

  if (name === "admin") return "/admin";

  if (name === "chat-settings") return "/chat/settings";

  if (name === "inbox") return "/messages";

  if (name === "room") return `/rooms/${id}`;

  if (name === "message") return `/messages/${id}`;

  if (name === "settings-section") return `/settings/${encodeURIComponent(id)}`;

  if (name === "online") return "/online";

  if (name === "image") return `/image/${encodeURIComponent(id)}`;

  if (name === "select") return `/preferences/${encodeURIComponent(id)}`;

  if (name === "reports" && !id) return "/reports";
  const base = `/profile/${id}`;
  const paths = {
    "history-chatting": "messages",
    "history-sanction": "sanctions",
    reports: "reports",
    authority: "permissions"
  };

  if (paths[name]) return `${base}/${paths[name]}`;

  if (name === "profile") return base;

  return "/";
};
