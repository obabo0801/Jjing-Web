import { on } from "#common/dom";
import sound from "#common/sound";
import vibrate from "#common/vibrate";

export default function button() {
  on(document, "click", (event) => {
    const button = event.target.closest?.("button:enabled[data-feedback]");

    if (!button) {
      return;
    }

    sound.play("click");
    vibrate.play("click");
  });
}
