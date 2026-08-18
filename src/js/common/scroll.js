import { on } from "#common/event";
import vibrate from "#common/vibrate";

export function scrollable(node) {
  let item = node instanceof Element
    ? node
    : null;

  while (item && item !== document.body) {
    if (
      item instanceof HTMLElement &&
      !item.hidden
    ) {
      const style = getComputedStyle(item);

      const x = item.scrollWidth > item.clientWidth + 1 &&
        ["auto", "scroll"].includes(style.overflowX);

      const y = item.scrollHeight > item.clientHeight + 1 &&
        ["auto", "scroll"].includes(style.overflowY);

      if (x || y) {
        return item;
      }
    }

    item = item.parentElement;
  }

  return document.scrollingElement;
}

export default function scroll() {
  const target = document.scrollingElement;

  if (!target) return;

  const bound = () => {
    const max = target.scrollHeight - target.clientHeight;

    if (max <= 0) return null;

    if (target.scrollTop <= 0) {
      return "top";
    }

    if (target.scrollTop >= max - 1) {
      return "bottom";
    }

    return null;
  };

  let last = bound();

  on(window, "scroll", () => {
    const current = bound();

    if (current && current !== last) {
      vibrate.touch();
    }

    last = current;
  }, { passive: true });
}
