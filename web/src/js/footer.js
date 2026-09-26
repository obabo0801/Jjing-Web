import * as dom from "#common/dom";
import * as css from "#common/css";
import device from "#common/device";
import toolbar from "#common/toolbar";

const items = [];

export default function footer(app) {
  if (!items.length) return;

  const root = toolbar(items, { compact: true });

  root.className = "footer";
  dom.remove(root, "data-blur");
  dom.remove(root, "data-shadow");
  app.append(root);

  const shadow = () => {
    const { small, wearable } = device();
    const view = window.visualViewport;
    const bottom = window.scrollY + (view?.offsetTop || 0) + (view?.height || window.innerHeight);

    for (const button of root.children)
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
