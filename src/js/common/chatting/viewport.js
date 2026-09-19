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
  let space = window.innerHeight;
  let inset = 0;

  const fit = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (!root.isConnected) return;

      const scale = view?.scale ?? 1;
      const zoom = Math.abs(scale - 1) > 0.01;
      const resize = width !== window.innerWidth;
      const visible = Math.round((view?.height ?? window.innerHeight) * scale);

      // 핀치만으로 줄어든 폭은 채팅 레이아웃에 다시 적용하지 않습니다.
      // 배율을 보정한 높이 변화는 실제 키보드/화면 변화로 처리합니다.
      if (zoom && !resize && height >= 0 && Math.abs(visible - space) < 2) {
        return;
      }

      space = visible;

      const editing = Boolean(
        root.querySelector(".chatting-editor:focus, .chatting-voice[data-recording]") ||
        root.hasAttribute("data-emotes")
      );

      if (resize) {
        width = window.innerWidth;
        full = window.innerHeight;
      }

      if (!editing) full = window.innerHeight;

      full = Math.max(full, window.innerHeight, visible);

      const keyboard = editing && visible < full - 2;
      const pinned = keyboard || (dom.has("wearable") && root.hasAttribute("data-emotes"));
      const offset = zoom ? 0 : view?.offsetTop || 0;
      const next = [
        width,
        window.innerHeight,
        visible,
        offset,
        window.scrollY,
        keyboard,
        pinned,
        zoom
      ].join(":");

      if (screen === next) return;

      screen = next;
      root.toggleAttribute("data-keyboard", keyboard);
      css.set(root, { "--chatting-width": `${Math.floor(width)}px` });

      const origin = root.getBoundingClientRect().top + window.scrollY;

      if (app) {
        css.set(app, {
          "--chatting-page-height": pinned ? `${Math.ceil(origin + window.innerHeight)}px` : null
        });
      }

      if (pinned && app && !zoom) {
        const top = Math.max(0, origin - offset);

        if (Math.abs(window.scrollY - top) > 1) {
          window.scrollTo({ top, behavior: "instant" });
        }
      }

      const top =
        zoom && !resize && height >= 0
          ? inset
          : Math.max(0, root.getBoundingClientRect().top - offset);

      inset = top;

      const footer = app?.querySelector(":scope > .footer");
      const reserved =
        dom.has("small") || dom.has("wearable") ? 0 : footer?.getBoundingClientRect().height || 0;
      const form = dom.query(".chatting-form", root);
      const toolbar = dom.query('.chatting-toolbar[data-position="top"]', root);
      const minimum =
        (form?.offsetHeight || 0) + (toolbar?.offsetHeight || 0) + Math.ceil(visible * 0.6);
      const available = Math.max(0, Math.floor(visible - top - reserved));
      const size = keyboard ? available : Math.max(minimum, available);

      if (Math.abs(size - height) < 1) return;

      const list = dom.query(".chatting-list", root);
      const bottom = list && list.scrollHeight - list.clientHeight - list.scrollTop < 32;

      height = size;
      css.set(root, { "--chatting-height": `${height}px` });
      dom.set(root, "data-viewport", "");
      if (bottom) list.scrollTop = list.scrollHeight;
    });
  };

  const update = () => {
    screen = undefined;

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

  const observer = new ResizeObserver(update);
  const form = dom.query(".chatting-form", root);
  const toolbar = dom.query('.chatting-toolbar[data-position="top"]', root);
  const host = app || root.closest("dialog");
  const head = host && dom.query(":scope > :is(.header, .layer-head, .dialog-head)", host);

  for (const target of [form, toolbar, head]) {
    if (target) observer.observe(target);
  }

  off.push(() => observer.disconnect());
  fit();

  return () => {
    cancelAnimationFrame(frame);
    off.forEach((remove) => remove());
    dom.remove(root, "data-keyboard");
    dom.remove(root, "data-viewport");
    css.set(root, { "--chatting-height": null, "--chatting-width": null });
    if (app) css.set(app, { "--chatting-page-height": null });
  };
}
