import { i18n, content } from "#shared/route";

import string from "#shared/string";

import * as dom from "#common/dom";
import api from "#common/api";
import { get, set } from "#common/storage";

const required = new Set();

let messages = {};
let pending;

const updateText = (element, value) => {
  const icon = dom.query(":scope > .icon", element);

  element.textContent = value;

  if (icon) {
    element.prepend(icon);
  }
};
const attributes = new Map([["data-i18n", updateText]]);

export const message = (key) => messages[key] || "";

export const preload = (...keys) => {
  keys.forEach((key) => {
    if (typeof key === "string" && key.trim()) {
      required.add(key.trim());
    }
  });
};

export const register = (attribute, update) => {
  if (!attribute || typeof update !== "function") {
    return () => {};
  }

  attributes.set(attribute, update);

  return () => {
    if (attributes.get(attribute) === update) {
      attributes.delete(attribute);
    }
  };
};

const hash = async (value) => {
  const data = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value.toLowerCase())
  );

  return [...new Uint8Array(data)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 8);
};
const encode = (value) => btoa(JSON.stringify(value));

export const decode = (value) => {
  const bytes = Uint8Array.from(atob(value), (character) =>
    character.charCodeAt(0)
  );

  return JSON.parse(new TextDecoder().decode(bytes));
};

export { translate };

export default async function translate(mode = get("lang", "system")) {
  mode = string(mode).trim().toLowerCase() || "system";
  set("lang", mode);

  const targets = [...attributes].flatMap(([attribute, update]) =>
    dom
      .all(`[${attribute}]`)
      .map((element) => ({
        element,
        key: dom.get(element, attribute)?.trim(),
        update
      }))
  );

  const names = [
    ...new Set([...targets.map(({ key }) => key), ...required])
  ].filter(Boolean);

  const task = {};

  pending = task;
  task.result = (async () => {
    if (!names.length) {
      return true;
    }

    try {
      const entries = await Promise.all(
        names.map(async (name) => [name, await hash(name)])
      );
      const keys = [...new Set(entries.map(([, key]) => key))];
      const text = Object.create(null);

      let lang;

      for (let index = 0; index < keys.length; index += 256) {
        if (pending !== task) {
          return pending.result;
        }

        const result = await api(i18n, {
          method: "POST",
          data: {
            [content]: encode({
              lang: mode,
              keys: keys.slice(index, index + 256)
            })
          }
        });

        // A superseded caller waits for the current translation, including layers.
        if (pending !== task) {
          return pending.result;
        }

        const value = result.data?.[content];

        if (!result.ok || typeof value !== "string") {
          return false;
        }

        const batch = decode(value);

        if (
          !batch ||
          typeof batch.lang !== "string" ||
          !batch.lang.trim() ||
          (lang && lang !== batch.lang) ||
          !batch.text ||
          typeof batch.text !== "object" ||
          Array.isArray(batch.text) ||
          Object.values(batch.text).some((value) => typeof value !== "string")
        ) {
          return false;
        }

        lang = batch.lang;
        Object.assign(text, batch.text);
      }

      messages = Object.fromEntries(
        entries
          .map(([name, key]) => [name, text[key]])
          .filter(([, value]) => typeof value === "string")
      );
      dom.root.lang = lang;

      targets.forEach(({ element, key, update }) => {
        const value = messages[key];

        if (typeof value === "string") {
          update(element, value);
        }
      });

      return true;
    } catch {
      return pending !== task ? pending.result : false;
    }
  })();

  return task.result;
}
