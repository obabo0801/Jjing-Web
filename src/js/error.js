import * as dom from "#common/dom";
import i18n from "#common/i18n";
import init from "#common/init";
import sound from "#common/sound";
import vibrate from "#common/vibrate";

import access from "#src/access";

const page = dom.query(".state");
const action = dom.query("button", page);
const loading = init();

dom.on(action, "click", () => {
  sound.play("click");
  vibrate.play("click");
  setTimeout(() => {
    location.replace("/");
  }, 150);
});

try {
  const allowed = await access(true, "error");

  if (allowed) {
    await i18n();
    page.hidden = false;
  }
} finally {
  loading.remove();
}
