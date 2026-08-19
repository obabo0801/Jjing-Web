import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const key = randomBytes(32);

const lock = (value) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);

  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final()
  ]);

  return { data, iv, tag: cipher.getAuthTag() };
};

const unlock = (value) => {
  const decipher = createDecipheriv(algorithm, key, value.iv);

  decipher.setAuthTag(value.tag);

  const data = Buffer.concat([decipher.update(value.data), decipher.final()]);

  return JSON.parse(data.toString("utf8"));
};

const flat = (value, prefix = "", result = {}) => {
  Object.entries(value).forEach(([key, data]) => {
    const name = prefix ? `${prefix}.${key}` : key;

    if (data && typeof data === "object" && !Array.isArray(data)) {
      flat(data, name, result);
    } else {
      result[name] = data;
    }
  });

  return result;
};

const dir = path.join(import.meta.dirname, "../locales");

const files = (await readdir(dir, { withFileTypes: true }))
  .filter(
    (file) =>
      file.isFile() && /^([a-z]{2}(?:-[a-z0-9]+)?)\.js$/i.test(file.name)
  )
  .sort((a, b) => a.name.localeCompare(b.name));

const data = {};

for (const file of files) {
  const lang = file.name.slice(0, -3).toLowerCase();

  const url = pathToFileURL(path.join(dir, file.name)).href;

  const { default: value } = await import(url);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    continue;
  }

  data[lang] = lock(flat(value));
}

export const langs = Object.keys(data);

if (!langs.length) {
  throw new Error();
}

export const locale = (lang) => (data[lang] ? unlock(data[lang]) : null);
