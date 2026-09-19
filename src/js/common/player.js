import * as dom from "./dom.js";
import * as i18n from "./i18n.js";
import range from "./range.js";
import "../../css/common/player.css";

const players = new Map();

let observer;

i18n.preload("player.play", "player.pause", "player.seek", "player.error");

const clock = (value) => {
  if (!Number.isFinite(value) || value < 0) return "--:--";
  const seconds = Math.floor(value);
  const hours = Math.floor(seconds / 3600);

  return `${hours ? `${hours}:` : ""}${String(Math.floor(seconds / 60) % 60).padStart(hours ? 2 : 1, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

function create(audio) {
  if (players.has(audio) || !audio.parentNode) return;
  const root = dom.create("div");
  const button = dom.create("button");
  const seek = dom.create("label");
  const name = dom.create("span");
  const slider = dom.create("div");
  const track = dom.create("span");
  const fill = dom.create("span");
  const thumb = dom.create("span");
  const input = dom.create("input");
  const time = dom.create("output");
  const error = dom.create("span");
  const off = [];

  let moving = false;
  let probing = false;
  let duration = NaN;
  let closed = false;
  let failed = false;

  root.className = `player ${audio.className}`.trim();
  audio.className = "";
  dom.set(root, "data-background", "");
  button.type = "button";
  for (const key of ["data-response", "data-circle", "data-color"]) dom.set(button, key, "");
  seek.className = "player-seek";
  name.className = "player-label";
  name.textContent = i18n.message("player.seek");
  dom.set(name, "data-i18n", "player.seek");
  slider.className = "range";
  track.className = "range-track";
  fill.className = "range-fill";
  thumb.className = "range-thumb";
  input.type = "range";
  input.min = "0";
  input.max = "0";
  input.step = "0.1";
  input.value = "0";
  time.className = "player-time";
  error.className = "player-error";
  error.textContent = i18n.message("player.error");
  dom.set(error, "data-i18n", "player.error");
  error.hidden = true;
  track.append(fill);
  slider.append(track, thumb, input);
  seek.append(name, slider);
  audio.before(root);
  root.append(audio, button, seek, time, error);
  audio.controls = false;
  audio.hidden = true;
  audio.preload = "metadata";
  range(root);

  const update = () => {
    if (Number.isFinite(audio.duration)) duration = audio.duration;
    const playing = !audio.paused && !audio.ended;

    dom.set(button, "data-icon", playing ? "pause" : "play");
    dom.set(button, "data-tooltip", playing ? "player.pause" : "player.play");
    button.title = i18n.message(playing ? "player.pause" : "player.play");
    root.toggleAttribute("data-playing", playing);
    root.toggleAttribute("data-error", Boolean(audio.error) || failed);
    error.hidden = !audio.error && !failed;
    button.disabled = Boolean(audio.error);
    input.disabled = !Number.isFinite(duration) || duration <= 0 || Boolean(audio.error);
    input.max = input.disabled ? "0" : String(duration);
    if (!moving && !probing) {
      input.value = String(audio.currentTime || 0);
      range(root);
    }

    time.textContent = `${clock(probing ? 0 : moving ? Number(input.value) : audio.currentTime)} / ${clock(duration)}`;
  };

  off.push(
    dom.on(button, "click", async () => {
      if (!audio.paused) return audio.pause();
      for (const item of players.keys()) if (item !== audio) item.pause();
      if (probing || audio.ended) audio.currentTime = 0;

      probing = false;
      failed = false;
      try {
        await audio.play();
      } catch {
        if (!closed) failed = true;
      }
      if (!closed) update();
    })
  );

  off.push(
    dom.on(input, "input", () => {
      moving = true;
      time.textContent = `${clock(Number(input.value))} / ${clock(duration)}`;
    })
  );

  off.push(
    dom.on(input, "change", () => {
      if (!input.disabled) audio.currentTime = Number(input.value);

      moving = false;
      update();
    })
  );

  off.push(
    dom.on(input, "pointercancel", () => {
      moving = false;
      update();
    })
  );

  off.push(
    dom.on(audio, "loadedmetadata", () => {
      // Recorded WebM files may reveal their duration only after seeking to the end.
      if (audio.duration === Infinity && audio.paused && audio.currentTime === 0) {
        probing = true;
        audio.currentTime = 1e10;
      }

      update();
    })
  );

  off.push(
    dom.on(audio, "seeked", () => {
      if (probing) {
        if (Number.isFinite(audio.currentTime) && audio.currentTime < 1e10)
          duration = audio.currentTime;

        probing = false;
        audio.currentTime = 0;
      }

      update();
    })
  );

  off.push(
    dom.on(audio, "emptied", () => {
      duration = NaN;
      probing = false;
      failed = false;
      update();
    })
  );

  for (const event of ["timeupdate", "durationchange", "play", "pause", "ended", "error"])
    off.push(dom.on(audio, event, update));
  players.set(audio, () => {
    closed = true;
    off.forEach((remove) => remove());
    audio.pause();
    players.delete(audio);
    audio.className = root.className.replace(/^player\s*/, "");
    audio.hidden = false;
    audio.controls = true;
    root.replaceWith(audio);
  });

  update();
}

export default function player(root = document) {
  dom.find("audio[controls]", root).forEach(create);
  if (!observer) {
    observer = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node instanceof Element) dom.find("audio[controls]", node).forEach(create);
      for (const [audio, close] of players) if (!audio.isConnected) close();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}
