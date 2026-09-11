import * as dom from "#common/dom";
import api from "#common/api";
import * as route from "#shared/route";

const entries = new Map();

export const get = (keyword) => entries.get(keyword);
const valid = (groups) =>
  Array.isArray(groups) &&
  groups.every(
    (group) =>
      typeof group?.title === "string" &&
      typeof group.icon === "string" &&
      Array.isArray(group.items) &&
      group.items.every(
        (item) =>
          typeof item?.keyword === "string" &&
          typeof item.src === "string" &&
          typeof item.still === "string"
      )
  );

let catalog = { groups: [], unavailable: false };
let pending;
let expires = 0;

export const load = () => {
  if (Date.now() < expires) return Promise.resolve(catalog);
  pending ||= api(route.emoji, { signal: AbortSignal.timeout(6500) })
    .then((response) => {
      if (!response.ok || !valid(response.data?.groups)) {
        catalog = { ...catalog, unavailable: true };
      } else {
        catalog = response.data;
        for (const group of catalog.groups) {
          for (const item of group.items) entries.set(item.keyword, item);
        }
      }
      expires = Date.now() + (catalog.unavailable ? 60000 : 3600000);
      return catalog;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
};

export const image = (item, lazy = false) => {
  const node = dom.create("img");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const still = dom.has("wearable") || reduce.matches;

  node.className = "chatting-emoji";
  node.alt = item.keyword;
  node.width = 40;
  node.height = 40;
  node.draggable = false;
  node.referrerPolicy = "no-referrer";
  if (lazy) node.loading = "lazy";
  dom.on(node, "error", () => node.replaceWith(item.keyword), { once: true });
  node.src = (still && item.still) || item.src;
  return node;
};

export const fragment = (text, editable = false) => {
  const result = document.createDocumentFragment();

  let end = 0;

  for (const match of text.matchAll(/\/[^/\s]{1,80}\//gu)) {
    const item = entries.get(match[0]);

    if (!item) continue;
    const node = image(item);
    const token = editable ? dom.create("span") : node;

    if (editable) {
      token.contentEditable = "false";
      dom.set(token, "data-emoji", item.keyword);
      token.append(node);
    }
    result.append(text.slice(end, match.index), token);
    end = match.index + match[0].length;
  }
  result.append(text.slice(end));
  return result;
};

export const render = (target, value = "") => {
  const text = String(value || "");
  const node = document.createTextNode(text);

  target.append(node);
  if (!text.includes("/")) return;
  if (entries.size) {
    node.replaceWith(fragment(text));
    return;
  }
  load().then(() => {
    if (node.parentNode === target) node.replaceWith(fragment(text));
  });
};
