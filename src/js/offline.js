import { get } from "#common/storage";
import { i18n, content } from "#config/route";

import * as dom from "#common/dom";
import api from "#common/api";
import init from "#common/init";

init();

if (location.pathname === "/offline") {
  history.replaceState(null, "", "/");
}

const decode = (value) => {
  const bytes = Uint8Array.from(atob(value), (value) =>
    value.charCodeAt(0)
  );

  return JSON.parse(new TextDecoder().decode(bytes));
};

try {
  const list = await api(i18n);
  const value = list.data?.[content];

  if (!list.ok || typeof value !== "string") {
    throw new Error();
  }

  const languages = decode(value);
  const mode = get("lang", "system").toLowerCase();
  const system = navigator.language.toLowerCase();
  const lang = mode === "system" ? system : mode;

  const file =
    languages[lang] ||
    languages[lang.split("-")[0]] ||
    languages.ko ||
    Object.values(languages)[0];

  if (!file) {
    throw new Error();
  }

  const result = await api(`${i18n}/${file}`);
  const data = result.data?.[content];

  if (!result.ok || typeof data !== "string") {
    throw new Error();
  }

  const { lang: selected, text } = decode(data);

  dom.root.lang = selected;

  dom.all("[data-i18n]").forEach((element) => {
    const key = dom.get(element, "data-i18n");

    if (Object.hasOwn(text, key)) {
      element.textContent = text[key];
    }
  });
} catch {}
