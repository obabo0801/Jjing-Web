import { on } from "#common/event";
import sound from "#common/sound";
import vibrate from "#common/vibrate";

let loaded = false;

export default function button() {
  if (loaded) {
    return;
  }

  on(document, "click", (event) => {
    const button = event.target.closest?.("button:enabled");

    if (!button) {
      return;
    }

    sound.click();
    vibrate.click();
  });

  loaded = true;
}
