import root from "#common/root";
import { query } from "#common/query";
import { on } from "#common/event";
import device from "#common/device";
import i18n from "#common/i18n";
import theme from "#common/theme";
import access from "#src/access";
import pwa, { subscribe } from "#src/pwa";
import voice from "#common/voice";

device();
theme();

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
