const user = "([a-f0-9]{32})";
const image = [
  "[a-f0-9]{32}",
  "icon-(?:192|512)",
  "giphy-[a-zA-Z0-9]{1,80}",
  "ogq-[a-f0-9]{8,32}-[0-9]{1,4}-(?:80|160|240)-(?:png|webp)"
].join("|");

const routes = [
  ["online", "popover", "/online"],
  ["profile", "popover", `/profile/${user}`],
  ["image", "popover", `/image/(${image})`],
  ["history-chatting", "drawer", `/profile/${user}/messages`],
  ["history-sanction", "drawer", `/profile/${user}/sanctions`],
  ["reports", "drawer", `/profile/${user}/reports`],
  ["reports", "drawer", "/reports"],
  ["authority", "drawer", `/profile/${user}/permissions`],
  ["select", "popover", "/preferences/([a-zA-Z0-9_-]{1,80})"]
].map(([name, type, path]) => ({
  name,
  type,
  pattern: new RegExp(`^${path}/?$`)
}));

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

  return state ? (state[1] === "reports" && !state[2] ? "admin" : "index") : "";
};

export const href = ([, name, id]) => {
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
