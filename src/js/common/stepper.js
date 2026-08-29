import * as dom from "#common/dom";
import sound from "#common/sound";
import vibrate from "#common/vibrate";

const held = new WeakSet();

let press;
let listening = false;

const limit = (input, value) => {
  const min = input.min === "" ? -Infinity : Number(input.min);

  const max = input.max === "" ? Infinity : Number(input.max);

  return Math.min(max, Math.max(min, value));
};

const paint = (input) => {
  const value = Number(input.value);

  const display = input.closest(".stepper-value");

  const number = dom.query(".stepper-number", display);

  if (number) {
    number.textContent = input.value;
  }

  if (Number.isFinite(value) && value >= 0) {
    dom.set(display, "data-positive", "");
  } else {
    dom.remove(display, "data-positive");
  }
};

const edit = (input) => {
  const display = input.closest(".stepper-value");

  const number = dom.query(".stepper-number", display);
  number.hidden = true;
  input.hidden = false;
  input.focus();
  input.select();
};

const commit = (input) => {
  const value = Number(input.value);

  if (Number.isFinite(value)) {
    input.value = String(limit(input, value));
  }

  paint(input);

  const display = input.closest(".stepper-value");

  const number = dom.query(".stepper-number", display);
  input.hidden = true;
  number.hidden = false;
};

const move = (input, direction) => {
  const value = Number(input.value) || 0;

  const step = Number(input.step) || 1;

  const next = limit(input, value + step * direction);

  if (next === value) {
    return;
  }

  input.value = String(next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  sound.play("snap");
  vibrate.play("stepper");
};

const change = (button) => {
  const container = button.closest(".stepper");

  const input = dom.query('input[type="number"]', container);

  const direction = Number(dom.get(button, "data-step"));

  if (!input || !Number.isFinite(direction)) {
    return;
  }

  move(input, direction);
};

const stop = () => {
  if (!press) {
    return;
  }

  clearTimeout(press.delay);
  clearInterval(press.repeat);

  if (press.held) {
    const button = press.button;
    setTimeout(() => {
      held.delete(button);
    });
  }

  press = undefined;
};

export default function stepper(root = document) {
  dom.all('.stepper input[type="number"]', root).forEach(paint);

  if (listening) {
    return;
  }

  listening = true;
  dom.on(document, "click", (event) => {
    const number = event.target.closest?.(".stepper-number");

    if (!number) {
      return;
    }

    const display = number.closest(".stepper-value");

    const input = dom.query('input[type="number"]', display);

    if (input) {
      edit(input);
    }
  });
  dom.on(
    document,
    "blur",
    (event) => {
      const input = event.target;

      if (!input.matches?.('.stepper input[type="number"]')) {
        return;
      }

      commit(input);
    },
    true
  );
  dom.on(document, "keydown", (event) => {
    const input = event.target;

    if (!input.matches?.('.stepper input[type="number"]')) {
      return;
    }

    if (event.key === "Enter") {
      input.blur();
    }
  });
  dom.on(document, "pointerdown", (event) => {
    const button = event.target.closest?.(
      ".stepper " + "button[data-step]:enabled"
    );

    if (!button) {
      return;
    }

    stop();
    press = { button, held: false };
    press.delay = setTimeout(() => {
      if (!press || press.button !== button) {
        return;
      }

      press.held = true;
      held.add(button);
      change(button);
      press.repeat = setInterval(() => {
        change(button);
      }, 90);
    }, 350);
  });
  dom.on(document, "pointerup", stop);
  dom.on(document, "pointercancel", stop);
  dom.on(document, "click", (event) => {
    const button = event.target.closest?.(
      ".stepper " + "button[data-step]:enabled"
    );

    if (!button) {
      return;
    }

    if (held.has(button)) {
      return;
    }

    change(button);
  });
  dom.on(document, "input", (event) => {
    const input = event.target;

    if (!input.matches?.(".stepper " + 'input[type="number"]')) {
      return;
    }

    paint(input);
  });
  dom.on(document, "change", (event) => {
    const input = event.target;

    if (!input.matches?.(".stepper " + 'input[type="number"]')) {
      return;
    }

    const value = Number(input.value);

    if (!Number.isFinite(value)) {
      return;
    }

    input.value = String(limit(input, value));
    paint(input);
  });
}
