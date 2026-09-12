import * as dom from "#common/dom";
import * as css from "#common/css";

export default function viewport(root) {
  const view = window.visualViewport;
  const app = root.closest(".app");
  const off = [];

  let frame;
  let height = -1;
  let width = window.innerWidth;
  let full = window.innerHeight;
  let screen;

  const fit = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (!root.isConnected) return;
      const visible = view?.height ?? window.innerHeight;
      const editing = Boolean(
        root.querySelector(
          ".chatting-editor:focus, .chatting-voice[data-recording]"
        ) || root.hasAttribute("data-emotes")
      );

      if (width !== window.innerWidth) {
        width = window.innerWidth;
        full = window.innerHeight;
      }
      if (!editing) full = window.innerHeight;
      full = Math.max(full, window.innerHeight, visible);
      const keyboard = editing && visible * (view?.scale || 1) < full - 2;
      const pinned =
        keyboard || (dom.has("wearable") && root.hasAttribute("data-emotes"));
      const offset = view?.offsetTop || 0;
      const nextScreen = [
        width,
        window.innerHeight,
        visible,
        view?.width,
        offset,
        window.scrollY,
        keyboard,
        pinned
      ].join(":");

      if (screen === nextScreen) return;
      screen = nextScreen;
      root.toggleAttribute("data-keyboard", keyboard);
      css.set(root, {
        "--chatting-width": `${Math.floor(view?.width || width)}px`
      });
      const origin = root.getBoundingClientRect().top + window.scrollY;

      if (app) {
        css.set(app, {
          "--chatting-page-height": pinned
            ? `${Math.ceil(origin + window.innerHeight)}px`
            : null
        });
      }
      if (pinned) {
        const top = Math.max(0, origin - offset);

        if (Math.abs(window.scrollY - top) > 1)
          window.scrollTo({ top, behavior: "instant" });
      }
      const top = Math.max(0, root.getBoundingClientRect().top - offset);
      const form = dom.query(".chatting-form", root);
      const toolbar = dom.query(".chatting-toolbar[data-position='top']", root);
      const emotes = dom.query(".chatting-emotes", root);
      const minimum =
        Math.ceil(form?.getBoundingClientRect().height || 0) +
        Math.ceil(toolbar?.getBoundingClientRect().height || 0) +
        (emotes ? 160 : 0) +
        50;
      const available = Math.floor(visible - top);
      const next = Math.max(minimum, available);

      root.toggleAttribute("data-cramped", available < minimum);
      if (Math.abs(next - height) < 1) return;
      const list = dom.query(".chatting-list", root);
      const bottom =
        list && list.scrollHeight - list.clientHeight - list.scrollTop < 32;

      height = next;
      css.set(root, { "--chatting-height": `${height}px` });
      dom.set(root, "data-viewport", "");
      if (bottom) list.scrollTop = list.scrollHeight;
    });
  };

  const update = () => {
    if (frame === undefined) fit();
  };

  for (const target of [window, view]) {
    off.push(dom.on(target, "resize", update, { passive: true }));
    off.push(dom.on(target, "scroll", update, { passive: true }));
  }
  off.push(dom.on(root, "focusin", update));
  off.push(dom.on(root, "focusout", update));
  off.push(dom.on(root, "chatting-viewport", update));
  off.push(dom.on(document, "visibilitychange", update));
  const observer = new ResizeObserver(() => {
    screen = undefined;
    update();
  });

  const form = dom.query(".chatting-form", root);

  if (form) observer.observe(form);
  off.push(() => observer.disconnect());
  fit();
  return () => {
    cancelAnimationFrame(frame);
    off.forEach((remove) => remove());
    dom.remove(root, "data-keyboard");
    dom.remove(root, "data-viewport");
    dom.remove(root, "data-cramped");
    css.set(root, { "--chatting-height": null, "--chatting-width": null });
    if (app) css.set(app, { "--chatting-page-height": null });
  };
}
