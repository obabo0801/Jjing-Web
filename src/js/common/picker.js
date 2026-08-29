import * as dom from "#common/dom";
import sound from "#common/sound";
import vibrate from "#common/vibrate";

const bound = new WeakSet();

const values = (column) => {
  const list = dom.get(column, "data-values");

  if (list) {
    const items = list.split(",");

    return items.map((value) => value.trim()).filter(Boolean);
  }

  const min = Number(dom.get(column, "data-min"));

  const max = Number(dom.get(column, "data-max"));

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }

  return Array.from({ length: max - min + 1 }, (_, index) =>
    String(min + index)
  );
};

const size = (list) => dom.query("button", list)?.offsetHeight || 40;

const buttons = (list) => dom.all("button", list);

const nearest = (list, value) => {
  const items = buttons(list);

  const current = Math.round(list.scrollTop / size(list));

  let result = null;
  let distance = Infinity;
  items.forEach((button, index) => {
    if (dom.get(button, "data-value") !== String(value)) {
      return;
    }

    const next = Math.abs(index - current);

    if (next >= distance) {
      return;
    }

    result = button;
    distance = next;
  });

  return result;
};

const move = (list, button, smooth = false) => {
  if (!button) {
    return;
  }

  const index = buttons(list).indexOf(button);

  if (index < 0) {
    return;
  }

  if (!smooth) {
    list.style.scrollBehavior = "auto";
  }

  list.scrollTo({
    top: index * size(list),
    behavior: smooth ? "smooth" : "auto"
  });

  if (!smooth) {
    requestAnimationFrame(() => {
      list.style.removeProperty("scroll-behavior");
    });
  }
};

const shift = (list, distance) => {
  list.style.scrollBehavior = "auto";
  list.scrollTop += distance;

  requestAnimationFrame(() => {
    list.style.removeProperty("scroll-behavior");
  });
};

const place = (list, button) => {
  const apply = () => {
    if (!list.clientHeight) {
      return false;
    }

    move(list, button);

    return true;
  };

  if (apply()) {
    return;
  }

  const observer = new ResizeObserver(() => {
    if (!apply()) {
      return;
    }

    observer.disconnect();
  });
  observer.observe(list);
};

const togglePeriod = (column) => {
  const picker = column.closest(".picker");

  const period = dom.query(".picker-column[data-period]", picker);

  if (!period) {
    return;
  }

  const list = dom.query(".picker-list", period);

  if (!list) {
    return;
  }

  const items = buttons(list);

  const selected = dom.query("button[data-selected]", period);

  const index = items.indexOf(selected);

  const next = items[(index + 1) % items.length];
  select(period, next, false);
  move(list, next, true);
};

const select = (column, button, sync = true) => {
  if (!button) {
    return false;
  }

  const previous = dom.get(column, "data-value");

  const value = dom.get(button, "data-value");

  const selected = dom.query("button[data-selected]", column);

  const focused = selected?.matches(":focus-visible") === true;

  if (selected !== button) {
    if (selected) {
      selected.tabIndex = -1;
      dom.remove(selected, "data-selected");
    }

    button.tabIndex = 0;
    dom.set(button, "data-selected", "");

    if (focused) {
      button.focus({ preventScroll: true });
    }
  }

  dom.set(column, "data-value", value);

  if (previous === null || previous === value) {
    return false;
  }

  if (
    sync &&
    dom.get(column, "data-hour") !== null &&
    ((previous === "11" && value === "12") ||
      (previous === "12" && value === "11"))
  ) {
    togglePeriod(column);
  }

  return true;
};

const edit = (column, button) => {
  if (dom.get(column, "data-min") === null) {
    return;
  }

  const input = dom.query(".picker-input", column);

  if (!input) {
    return;
  }

  input.value = dom.get(button, "data-value");
  dom.set(column, "data-edit", "");
  input.hidden = false;
  input.focus();
  input.select();
};

const close = (column) => {
  const input = dom.query(".picker-input", column);

  if (!input) {
    return;
  }

  input.hidden = true;
  dom.remove(column, "data-edit");
};

const commit = (column) => {
  const input = dom.query(".picker-input", column);

  const list = dom.query(".picker-list", column);

  if (!input || !list) {
    return;
  }

  const min = Number(input.min);
  const max = Number(input.max);

  const number = Number(input.value);

  const value = String(
    Math.min(max, Math.max(min, Number.isFinite(number) ? number : min))
  );
  close(column);

  const button = nearest(list, value);
  select(column, button);
  move(list, button, true);
};

const append = (list, items, count) => {
  for (let cycle = 0; cycle < count; cycle += 1) {
    items.forEach((value) => {
      const button = dom.create("button");
      button.type = "button";
      button.tabIndex = -1;
      button.textContent = value;
      dom.set(button, "data-value", value);
      list.append(button);
    });
  }
};

const build = (column) => {
  if (bound.has(column)) {
    return;
  }

  const items = values(column);

  if (!items.length) {
    return;
  }

  const loop = dom.get(column, "data-loop") !== null;

  const list = dom.create("div");
  list.className = "picker-list";
  append(list, items, loop ? 3 : 1);
  column.append(list);

  const min = dom.get(column, "data-min");

  const max = dom.get(column, "data-max");

  let input;

  if (min !== null && max !== null) {
    const name = dom.get(column, "data-name");
    input = dom.create("input");
    input.type = "number";
    input.min = min;
    input.max = max;
    input.autocomplete = "off";
    input.hidden = true;

    if (name) {
      input.name = name;
    }

    input.className = "picker-input";
    column.append(input);
  }

  const current = dom.get(column, "data-value") ?? items[0];

  const matches = buttons(list).filter(
    (button) => dom.get(button, "data-value") === current
  );

  const selected = matches[loop ? 1 : 0] ?? matches[0];
  select(column, selected, false);
  place(list, selected);

  let frame;
  let timer;

  const active = () => {
    dom.set(column, "data-move", "");
  };

  const inactive = () => {
    if (dom.get(column, "data-pressed") !== null) {
      return;
    }

    dom.remove(column, "data-move");
  };

  const settle = () => {
    clearTimeout(timer);
    timer = setTimeout(inactive, 160);
  };

  const feedback = () => {
    const height = size(list);

    const current = list.scrollTop;

    const previous = dom.get(column, "data-scroll");
    dom.set(column, "data-scroll", current);

    if (previous === null) {
      return;
    }

    const before = Number(previous) / height;

    const after = current / height;

    const crossed =
      after > before
        ? Math.floor(after) > Math.floor(before)
        : Math.ceil(after) < Math.ceil(before);

    if (!crossed) {
      return;
    }

    sound.play("snap");
    vibrate.play("picker");
  };

  const press = (event) => {
    if (event.pointerType === "mouse") {
      dom.set(column, "data-y", event.clientY);
    }

    dom.set(column, "data-pressed", "");
    active();
    clearTimeout(timer);
  };

  const drag = (event) => {
    const value = dom.get(column, "data-y");

    if (
      event.pointerType !== "mouse" ||
      dom.get(column, "data-pressed") === null ||
      value === null
    ) {
      return;
    }

    const y = Number(value);

    const distance = y - event.clientY;

    if (!distance) {
      return;
    }

    list.setPointerCapture?.(event.pointerId);
    dom.set(column, "data-y", event.clientY);
    dom.set(column, "data-drag", "");
    list.scrollTop += distance;
    event.preventDefault();
  };

  const release = (event) => {
    dom.remove(column, "data-y");
    dom.remove(column, "data-pressed");

    if (
      event.pointerType === "touch" &&
      list.contains(document.activeElement)
    ) {
      document.activeElement.blur();
    }

    settle();
    setTimeout(() => {
      dom.remove(column, "data-drag");
    });
  };

  const pointerCancel = (event) => {
    release(event);
  };

  const wheel = () => {
    active();
    settle();
  };

  const scroll = () => {
    feedback();

    if (dom.get(column, "data-move") !== null) {
      settle();
    }

    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const all = buttons(list);

      const height = size(list);

      let index = Math.round(list.scrollTop / height);

      if (loop) {
        const length = items.length;
        let offset = 0;

        if (index <= 0) {
          offset = length;
        } else if (index >= all.length - 1) {
          offset = -length;
        }

        if (offset) {
          shift(list, offset * height);
          index += offset;

          dom.set(column, "data-scroll", list.scrollTop);
        }
      }

      index = Math.min(all.length - 1, Math.max(0, index));
      select(column, all[index]);
    });
  };

  const click = (event) => {
    if (dom.get(column, "data-drag") !== null) {
      return;
    }

    const button = event.target.closest?.("button");

    if (!button) {
      return;
    }

    const selected = dom.get(button, "data-selected") !== null;

    if (!selected) {
      active();
      move(list, button, true);

      return;
    }

    edit(column, button);
  };

  const blur = () => {
    commit(column);
  };

  const keydown = (event) => {
    if (event.key === "Enter") {
      input.blur();

      return;
    }

    if (event.key === "Escape") {
      close(column);
    }
  };

  if (input) {
    dom.on(input, "blur", blur);
    dom.on(input, "keydown", keydown);
  }

  dom.on(list, "pointerdown", press);
  dom.on(list, "pointermove", drag);
  dom.on(list, "pointerup", release);
  dom.on(list, "pointercancel", pointerCancel);
  dom.on(list, "wheel", wheel, { passive: true });
  dom.on(list, "scroll", scroll);
  dom.on(list, "click", click);
  bound.add(column);
};

export default function picker(root = document) {
  dom.all(".picker-column", root).forEach(build);
}
