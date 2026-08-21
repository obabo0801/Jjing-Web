const bound = new WeakSet();

export default function bind(dialog, { backdrop = true } = {}) {
  if (!(dialog instanceof HTMLDialogElement)) {
    return null;
  }

  dialog.setAttribute("data-backdrop", String(backdrop));

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

  bound.add(dialog);

  return dialog;
}

export const show = (dialog, options) => {
  if (!bind(dialog, options) || dialog.open) {
    return false;
  }

  dialog.showModal();

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
