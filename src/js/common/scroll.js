import * as dom from "#common/dom";
import vibrate from "#common/vibrate";

export function scrollable(node) {
  let item = node instanceof Element ? node : null;

  while (item && item !== dom.body) {
    if (item instanceof HTMLElement && !item.hidden) {
      const style = getComputedStyle(item);

      const x =
        item.scrollWidth > item.clientWidth + 1 &&
        ["auto", "scroll"].includes(style.overflowX);

      const y =
        item.scrollHeight > item.clientHeight + 1 &&
        ["auto", "scroll"].includes(style.overflowY);

      if (x || y) {
        return item;
      }
    }

    item = item.parentElement;
  }

  return dom.scroller;
}

export default function scroll() {
  const target = dom.scroller;

  if (!target) {
    return;
  }

  const bound = () => {
    const max = target.scrollHeight - target.clientHeight;

    if (max <= 0) {
      return null;
    }

    if (target.scrollTop <= 0) {
      return "top";
    }

    if (target.scrollTop >= max - 1) {
      return "bottom";
    }

    return null;
  };

  let previous = bound();

  dom.on(
    window,
    "scroll",
    () => {
      const position = bound();

      if (position && position !== previous) {
        vibrate.touch();
      }

      previous = position;
    },
    { passive: true }
  );
}
