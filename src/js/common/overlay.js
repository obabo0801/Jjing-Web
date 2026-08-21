import { show } from "#common/dialog";

let overlay;
let content;

const load = () => {
  if (overlay) {
    return overlay;
  }

  const wrapper = document.createElement("div");

  overlay = document.createElement("dialog");
  overlay.className = "overlay";

  content = document.createElement("div");
  content.className = "overlay-content";
  overlay.append(content);

  overlay.addEventListener("cancel", (event) => {
    event.preventDefault();
  });

  wrapper.append(overlay);
  document.body.append(wrapper);

  return overlay;
};

export const open = ({ busy = true } = {}) => {
  const item = load();

  item.setAttribute("data-busy", String(busy));
  show(item, { backdrop: false });

  return item;
};

export const close = () => {
  if (overlay?.open) {
    overlay.close();
  }
};

export const run = async (task, options) => {
  open(options);

  try {
    return await task();
  } finally {
    close();
  }
};

export default { open, close, run };
