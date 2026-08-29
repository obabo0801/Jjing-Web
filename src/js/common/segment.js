import * as dom from "#common/dom";
import sound from "#common/sound";
import vibrate from "#common/vibrate";

export default function segment() {
  dom.on(document, "click", (event) => {
    const button = event.target.closest?.(".segment button:enabled");

    if (!button) {
      return;
    }

    const container = button.closest(".segment");

    const selected = dom.query("button[data-selected]", container);

    if (selected === button) {
      return;
    }

    dom.remove(selected, "data-selected");
    dom.set(button, "data-selected", "");
    sound.play("click");
    vibrate.play("segment");
  });
}
