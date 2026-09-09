import { randomBytes } from "node:crypto";

const links = new Map();
const expire = 5 * 60 * 1000;

export const create = (uid) => {
  const value = randomBytes(24).toString("base64url");

  links.set(value, { uid, expires: Date.now() + expire });

  return value;
};

export const get = (value) => {
  const item = links.get(value);

  if (!item || item.expires < Date.now()) {
    links.delete(value);
    return null;
  }

  return item;
};

export const remove = (value) => links.delete(value);

export const refresh = (item) => {
  item.expires = Date.now() + expire;
};

export const valid = (value) => Boolean(get(value));

const clear = () => {
  const now = Date.now();

  for (const [key, item] of links) {
    if (item.expires < now) {
      links.delete(key);
    }
  }
};

const timer = setInterval(clear, 60_000);

timer.unref?.();
