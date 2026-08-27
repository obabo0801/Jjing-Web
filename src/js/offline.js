import { content, i18n } from "#config/route";

import * as dom from "#common/dom";
import api from "#common/api";
import { decode } from "#common/i18n";
import init from "#common/init";
import * as storage from "#common/storage";
import sound from "#common/sound";
import vibrate from "#common/vibrate";
import * as tts from "#common/tts";

const page = dom.query(".state");
const heading = dom.query("h1", page);
const action = dom.query("button", page);
const loading = init();

dom.on(page, "click", (event) => {
  if (event.target.closest("button")) {
    return;
  }

  if (!tts.busy()) {
    tts.speak(heading.textContent);
  }
});

dom.on(action, "click", async () => {
  sound.play("click");
  vibrate.play("click");

  setTimeout(() => {
    location.reload();
  }, 150);
});

if (location.pathname === "/offline") {
  history.replaceState(null, "", "/");
}

try {
  const list = await api(i18n);
  const value = list.data?.[content];

  if (!list.ok || typeof value !== "string") {
    throw new Error();
  }

  const languages = decode(value);

  const mode = storage.get("lang", "system").toLowerCase();

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
} catch {
} finally {
  page.hidden = false;
  loading.remove();
}
