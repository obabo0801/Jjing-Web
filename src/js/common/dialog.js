import { add, back } from "#common/back";

const bound = new WeakSet();
const backs = new WeakMap();

const native = !("CloseWatcher" in window);

export default function bind(dialog, { backdrop = true } = {}) {
  if (!(dialog instanceof HTMLDialogElement)) {
    return null;
  }

  dialog.setAttribute("data-backdrop", String(backdrop));

  if (!native) {
    dialog.setAttribute("closedby", "none");
  }

  if (bound.has(dialog)) {
    return dialog;
  }

  dialog.addEventListener("click", (event) => {
    const enabled = dialog.getAttribute("data-backdrop") !== "false";

    if (event.target !== dialog || !enabled) {
      return;
    }

    const box = dialog.getBoundingClientRect();

    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;

    if (outside) {
      dialog.close("cancel");
    }
  });

  dialog.addEventListener("cancel", (event) => {
    if (!native) {
      return;
    }

    event.preventDefault();

    back().catch(() => {});
  });

  dialog.addEventListener("close", () => {
    backs.get(dialog)?.();
    backs.delete(dialog);
  });

  bound.add(dialog);

  return dialog;
}

export const show = (dialog, options) => {
  if (!bind(dialog, options) || dialog.open) {
    return false;
  }

  backs.get(dialog)?.();
  backs.delete(dialog);

  dialog.showModal();

  backs.set(
    dialog,
    add(() => {
      if (dialog.open) {
        dialog.close("cancel");
      }
    })
  );

  return true;
};

export const close = (dialog, value = "cancel") => {
  if (!dialog?.open) {
    return false;
  }

  dialog.close(value);

  return true;
};

export const wait = (dialog) =>
  new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue), {
      once: true
    });
  });
