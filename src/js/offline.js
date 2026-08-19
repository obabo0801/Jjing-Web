import { get } from "#common/storage";
import { i18n, payload } from "#config/route";

import root from "#common/root";
import { all } from "#common/query";
import api from "#common/api";
import init from "#common/init";

init();

if (location.pathname === "/offline") {
  history.replaceState(null, "", "/");
}

const decode = (value) => {
  const bytes = Uint8Array.from(atob(value), (value) => value.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes));
};

try {
  const list = await api(i18n);
  const value = list.data?.[payload];

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
  const data = result.data?.[payload];

  if (!result.ok || typeof data !== "string") {
    throw new Error();
  }

  const { lang: selected, text } = decode(data);

  root.lang = selected;

  all("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");

    if (Object.hasOwn(text, key)) {
      element.textContent = text[key];
    }
  });
} catch {}
