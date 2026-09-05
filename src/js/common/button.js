import { on } from "#common/dom";
import sound from "#common/sound";
import vibrate from "#common/vibrate";

export let trigger;

export default function button() {
  on(
    document,
    "click",
    (event) => {
      const source = event.target.closest?.(
        "button:enabled"
      );

      trigger = source;
      setTimeout(() => {
        if (trigger === source) {
          trigger = undefined;
        }
      });
    },
    true
  );

  on(document, "click", (event) => {
    const button = event.target.closest?.(
      "button:enabled[data-response]"
    );

    if (!button) {
      return;
    }

    sound.play("click");
    vibrate.play("click");
  });
}
