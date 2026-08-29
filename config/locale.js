import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const flat = (value, prefix = "", result = {}) => {
  for (const [key, data] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;

    if (data && typeof data === "object" && !Array.isArray(data)) {
      flat(data, name, result);
    } else {
      result[name] = data;
    }
  }

  return result;
};

const dir = path.join(import.meta.dirname, "../locales");

const files = (await readdir(dir, { withFileTypes: true }))
  .filter(
    (file) =>
      file.isFile() && /^([a-z]{2}(?:-[a-z0-9]+)?)\.js$/i.test(file.name)
  )
  .sort((a, b) => a.name.localeCompare(b.name));

const locales = {};

for (const file of files) {
  const lang = file.name.slice(0, -3).toLowerCase();
  const url = pathToFileURL(path.join(dir, file.name)).href;

  const { default: value } = await import(url);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    continue;
  }

  locales[lang] = flat(value);
}

export const langs = Object.keys(locales);

if (!langs.length) {
  throw new Error();
}

export const locale = (lang) => locales[lang] ?? null;
