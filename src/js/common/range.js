import { on } from "#common/event";
import { all } from "#common/query";

const bound = new WeakSet();

const paint = (input) => {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const value = Number(input.value);
  const size = max - min;
  const ratio = size ? ((value - min) / size) * 100 : 0;
  const root = input.closest(".range");
  const fill = root?.querySelector(".range-fill");
  const thumb = root?.querySelector(".range-thumb");

  if (fill) {
    fill.style.width = `${ratio}%`;
  }

  if (thumb) {
    thumb.style.insetInlineStart = `${ratio}%`;
  }
};

export default function range(root = document) {
  all('.range input[type="range"]', root).forEach((input) => {
    paint(input);

    if (bound.has(input)) {
      return;
    }

    on(input, "input", () => paint(input));
    bound.add(input);
  });
}
