import * as dom from "#common/dom";
import i18n from "#common/i18n";
import init from "#common/init";
import sound from "#common/sound";
import vibrate from "#common/vibrate";
import * as tts from "#common/tts";

import access from "#src/access";

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

try {
  await Promise.all([access(false, "denied"), i18n()]);
} finally {
  page.hidden = false;
  loading.remove();
}
