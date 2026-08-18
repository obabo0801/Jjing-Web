import root from "#common/root";
import { query } from "#common/query";
import { on } from "#common/event";
import device from "#common/device";
import theme from "#common/theme";
import icon from "#common/icon";
import button from "#common/button";
import scroll from "#common/scroll";
import { watch } from "#common/back";
import { bind as drag } from "#common/drag";
import i18n from "#common/i18n";
import access from "#src/access";
import pwa, { subscribe } from "#src/pwa";
import voice from "#common/voice";

device();
theme();
icon();
button();
scroll();
watch();
drag(document);

const allowed = await access();

if (allowed) {
  const [, registration] = await Promise.all([
    i18n(),
    pwa().catch(() => null)
  ]);

  const button = query("#push");

  on(button, "click", () => {
    subscribe(registration);
  });

  const mic = query("#voice");
  const output = query("#voice-result");

  on(mic, "click", async () => {
    const result = await voice({
      ko: ["안녕"]
    });

    output.textContent = JSON.stringify(
      result, null, 2
    );
  });
}

root.removeAttribute("data-access");

import speak from "#common/tts";
import swipe from "#common/swipe";

swipe("←", () => {
  speak("왼쪽");
});

swipe("→", () => {
  speak("오른쪽");
});

swipe("↑", () => {
  speak("위");
});

swipe("↓", () => {
  speak("아래");
});

swipe("↖", () => {
  speak("왼쪽 위");
});

swipe("↗", () => {
  speak("오른쪽 위");
});

swipe("↙", () => {
  speak("왼쪽 아래");
});

swipe("↘", () => {
  speak("오른쪽 아래");
});
