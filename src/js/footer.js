import * as dom from "#common/dom";
import * as css from "#common/css";
import device from "#common/device";
import * as direct from "#common/chatting/direct";

export default function footer(app) {
  const root = dom.create("footer");
  const button = dom.create("button");

  root.className = "footer";
  button.type = "button";
  dom.set(button, "data-background", "");
  dom.set(button, "data-icon", "mail");
  dom.set(button, "data-color", "");
  dom.set(button, "data-circle", "");
  dom.set(button, "data-tooltip", "direct.inbox");
  dom.set(button, "data-response", "");
  dom.on(button, "click", () => direct.inbox());
  root.append(button);
  app.append(root);

  const shadow = () => {
    const { small, wearable } = device();
    const view = window.visualViewport;
    const bottom = window.scrollY + (view?.offsetTop || 0) + (view?.height || window.innerHeight);

    button.toggleAttribute(
      "data-shadow",
      !small && !wearable && document.documentElement.scrollHeight > bottom + 1
    );

    css.set(root, {
      "--footer-bottom": `${Math.max(
        0,
        window.innerHeight - (view?.height || window.innerHeight) - (view?.offsetTop || 0)
      )}px`
    });
  };

  dom.on(window, "scroll", shadow, { passive: true });
  dom.on(window, "pageshow", shadow);
  dom.on(window, "resize", shadow);
  if (window.visualViewport) {
    dom.on(window.visualViewport, "resize", shadow);
    dom.on(window.visualViewport, "scroll", shadow);
  }

  new ResizeObserver(shadow).observe(app);
  shadow();
}
