const clamp = (value) => Math.min(Math.max(Number(value) || 0, 0), 100);

export default function progress(options = {}) {
  if (typeof options === "number") {
    options = { value: options };
  }

  const root = document.createElement("div");
  const track = document.createElement("div");
  const fill = document.createElement("div");
  const output = document.createElement("output");

  root.className = "progress";
  const type = options.type === "circular" ? "circular" : "linear";

  root.setAttribute("data-progress-type", type);

  track.className = "progress-track";
  fill.className = "progress-fill";
  output.className = "progress-value";
  output.hidden = options.showValue === false;

  track.append(fill);
  root.append(track, output);

  let value = 0;

  const set = (next) => {
    value = clamp(next);
    fill.style.width = `${value}%`;

    if (type === "circular") {
      root.style.background = `conic-gradient(
        var(--focus) ${value}%,
        var(--border) 0
      )`;
    }

    output.value = `${Math.round(value)}%`;

    return value;
  };

  const api = {
    element: root,
    get: () => value,
    set,
    destroy: () => root.remove()
  };

  set(options.value);
  options.target?.append(root);

  return api;
}
