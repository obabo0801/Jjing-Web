import * as dom from "#common/dom";
import sheet from "#common/sheet";

const opened = new WeakSet();

const copy = async (value) => {
  if (value) {
    await navigator.clipboard.writeText(value);
  }
};

const save = async (source) => {
  const response = await fetch(source);

  if (!response.ok) {
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = dom.create("a");
  const path = new URL(source, location.href).pathname;

  link.href = url;
  link.download = path.split("/").at(-1) || "image";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url));
};

const item = ({
  value,
  text,
  icon,
  run,
  danger = false,
  disabled = false
}) => {
  const row = dom.create("div");
  const button = dom.create("button");

  row.className = "group-item";
  button.type = "button";
  button.textContent = text;
  button.disabled = disabled;

  dom.set(row, "data-icon", icon);
  dom.set(button, "data-i18n", text);
  dom.set(button, "data-response", "");
  dom.set(button, "data-layer-action", value);

  if (danger) {
    dom.set(row, "data-danger", "");
  }

  dom.on(button, "click", () => {
    Promise.resolve(run()).catch(() => {});
  });

  row.append(button);
  return row;
};

const group = (...items) => {
  const element = dom.create("div");

  element.className = "group";
  element.append(...items);

  return element;
};

const content = (message, options) => {
  const element = dom.create("div");
  const items = [
    item({
      value: "copy-text",
      text: "chatting.action.copyText",
      icon: "copy",
      run: () => copy(options.text)
    })
  ];

  if (options.image) {
    items.push(
      item({
        value: "save-image",
        text: "chatting.action.saveImage",
        icon: "download",
        run: () => save(options.image)
      }),
      item({
        value: "copy-image",
        text: "chatting.action.copyImage",
        icon: "link",
        run: () => copy(options.image)
      })
    );
  }

  items.push(
    item({
      value: "copy-link",
      text: "chatting.action.copyLink",
      icon: "link",
      disabled: !options.url,
      run: () => copy(options.url)
    })
  );

  const report = item({
    value: "report",
    text: "chatting.action.report",
    icon: "flag",
    danger: true,
    run: () => {
      message.dispatchEvent(
        new CustomEvent("chatting-report", {
          bubbles: true,
          detail: options
        })
      );
    }
  });

  element.className = "chatting-actions";
  element.append(group(...items), group(report));

  return element;
};

const reveal = (message, sheet) => {
  const list = message.closest(".chatting-list");

  if (!list) {
    return () => {};
  }

  const item = message.getBoundingClientRect();
  const area = list.getBoundingClientRect();
  const panel = sheet.getBoundingClientRect();
  const bottom = Math.min(area.bottom, panel.top) - 16;

  if (item.bottom <= bottom) {
    return () => {};
  }

  const padding = list.style.paddingBlockEnd;

  list.style.paddingBlockEnd = `${panel.height + 16}px`;

  list.scrollBy({
    top: item.bottom - bottom,
    behavior: "smooth"
  });

  return () => {
    list.style.paddingBlockEnd = padding;
  };
};

const open = async (message, options) => {
  if (opened.has(message)) {
    return;
  }

  opened.add(message);
  dom.set(message, "data-action", "");

  let reset = () => {};

  try {
    await sheet({
      content: content(message, options),
      direction: "↓",
      ready: (element) => {
        reset = reveal(message, element);
      }
    });
  } finally {
    reset();
    dom.remove(message, "data-action");
    opened.delete(message);
  }
};

export default function action(message, options) {
  let timer;
  let pointer;
  let held = false;

  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
    pointer = undefined;
  };

  const show = () => {
    open(message, options).catch(() => {});
  };

  dom.on(message, "pointerdown", (event) => {
    if (event.pointerType === "mouse") {
      return;
    }

    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };

    timer = setTimeout(() => {
      held = true;
      timer = undefined;
      show();
    }, 500);
  });

  dom.on(message, "pointermove", (event) => {
    if (!pointer || event.pointerId !== pointer.id) {
      return;
    }

    const x = event.clientX - pointer.x;
    const y = event.clientY - pointer.y;

    if (Math.hypot(x, y) > 10) {
      clear();
    }
  });

  dom.on(message, "pointerup", () => {
    clear();

    if (held) {
      setTimeout(() => {
        held = false;
      });
    }
  });

  dom.on(message, "pointercancel", clear);

  dom.on(
    message,
    "click",
    (event) => {
      if (!held) {
        return;
      }

      held = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  dom.on(message, "contextmenu", (event) => {
    event.preventDefault();
    show();
  });
}
