import { get, set } from "#common/storage";
import { i18n, payload } from "#config/route";

import root from "#common/root";
import { all } from "#common/query";
import api from "#common/api";

const key = "lang";

const hash = async (value) => {
  const data = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value.toLowerCase())
  );

  return [...new Uint8Array(data)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 8);
};

const encode = (value) => btoa(JSON.stringify(value));

export default async function translate(
  mode = get(key, "system")
) {
  mode = typeof mode === "string" && mode.trim()
    ? mode.trim().toLowerCase()
    : "system";

  set(key, mode);

  const elements = all("[data-i18n]");

  const names = [
    ...new Set(
      elements.map((element) =>
        element.getAttribute("data-i18n")
      )
    )
  ];

  if (!names.length) {
    return true;
  }

  const entries = await Promise.all(
    names.map(async (name) => [name, await hash(name)])
  );

  const ids = Object.fromEntries(entries);

  const keys = entries.map(([, key]) => key);

  if (!keys.length) {
    return true;
  }

  try {
    const result = await api(i18n, {
      method: "POST",

      data: {
        [payload]: encode({ lang: mode, keys })
      }
    });

    const value = result.data?.[payload];

    if (!result.ok || typeof value !== "string") {
      return false;
    }

    const bytes = Uint8Array.from(
      atob(value),
      (value) => value.charCodeAt(0)
    );

    const { lang, text } = JSON.parse(
      new TextDecoder().decode(bytes)
    );

    root.lang = lang;

    elements.forEach((element) => {
      const name = element.getAttribute("data-i18n");

      const id = ids[name];

      if (Object.hasOwn(text, id)) {
        const icon = element.querySelector(
          ":scope > .icon"
        );

        element.textContent = text[id];

        if (icon) {
          element.prepend(icon);
        }
      }
    });

    return true;
  } catch {
    return false;
  }
}
