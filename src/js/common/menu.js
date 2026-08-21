import { add, back as goBack } from "#common/back";
import bindDialog, {
  show as showDialog,
  close as closeDialog
} from "#common/dialog";
import { on } from "#common/event";

const noop = () => {};

export default function bind(view, { root = "root", trigger } = {}) {
  if (!bindDialog(view)) {
    return null;
  }

  let current = root;
  let removePage = noop;

  const select = (name = root, focus = true) => {
    const pages = view.querySelectorAll("[data-page]");

    const selected = view.querySelector(`[data-page="${name}"]`);

    if (!selected) {
      return false;
    }

    pages.forEach((page) => {
      page.hidden = page !== selected;
    });

    current = name;

    if (focus && view.open) {
      selected.querySelector("button, input")?.focus();
    }

    return true;
  };

  const reset = (focus = false) => {
    removePage();
    removePage = noop;

    return select(root, focus);
  };

  const open = () => {
    if (view.open) {
      return false;
    }

    reset();

    if (!showDialog(view)) {
      return false;
    }

    trigger?.setAttribute("data-open", "");

    select(root);

    return true;
  };

  const close = (value = "cancel") => closeDialog(view, value);

  const show = (name) => {
    if (
      !name ||
      name === current ||
      !view.querySelector(`[data-page="${name}"]`)
    ) {
      return false;
    }

    removePage();
    removePage = noop;

    select(name);

    removePage = add(() => {
      removePage = noop;

      select(root);
    });

    return true;
  };

  const back = () => goBack();

  on(view, "click", (event) => {
    const target = event.target.closest?.("button");

    const next = target?.getAttribute("data-open");

    if (next) {
      show(next);

      return;
    }

    if (target?.hasAttribute("data-back")) {
      back().catch(() => {});
    }
  });

  on(view, "close", () => {
    reset();

    trigger?.removeAttribute("data-open");

    trigger?.focus();
  });

  return Object.freeze({ open, close, show, back, reset });
}
