import * as dom from "./dom.js";
import * as i18n from "./i18n.js";
import range from "./range.js";
import "../../css/common/player.css";

const players = new Map();

let observer;

i18n.preload("player.play", "player.pause", "player.seek", "player.error", "player.volume");

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
  const caption = dom.create("span");
  const seek = dom.create("label");
  const name = dom.create("span");
  const slider = dom.create("div");
  const track = dom.create("span");
  const fill = dom.create("span");
  const thumb = dom.create("span");
  const input = dom.create("input");
  const time = dom.create("output");
  const total = dom.create("output");
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
  button.className = "player-control";
  caption.className = "player-label";
  button.append(caption);
  for (const key of ["data-response", "data-circle", "data-shadow"]) dom.set(button, key, "");
  seek.className = "player-seek";
  name.className = "player-label";
  name.textContent = i18n.message("player.seek");
  dom.set(name, "data-i18n", "player.seek");
  slider.className = "range";
  track.className = "range-track";
  fill.className = "range-fill";
  thumb.className = "range-thumb";
  input.type = "range";
  input.name = "position";
  input.min = "0";
  input.max = "1000";
  input.step = "1";
  input.value = "0";
  time.className = "player-time";
  total.className = "player-total";
  error.className = "player-error";
  error.textContent = i18n.message("player.error");
  dom.set(error, "data-i18n", "player.error");
  error.hidden = true;
  track.append(fill);
  slider.append(track, thumb, input);
  seek.append(name, slider, time, total);

  const volume = dom.create("button");
  const label = dom.create("span");

  volume.className = "player-volume";
  volume.type = "button";
  label.className = "player-label";
  label.textContent = i18n.message("player.volume");
  dom.set(label, "data-i18n", "player.volume");
  volume.append(label);
  for (const key of ["data-response", "data-circle"]) dom.set(volume, key, "");

  const loudness = () => {
    const value = audio.muted ? 0 : Math.round(audio.volume * 100);

    dom.set(
      volume,
      "data-icon",
      value ? (value > 50 ? "volume-high" : "volume-low") : "volume-mute"
    );
  };

  off.push(
    dom.on(volume, "click", () => {
      if (audio.muted || audio.volume === 0) {
        if (audio.volume === 0) audio.volume = 1;

        audio.muted = false;
      } else audio.muted = true;

      loudness();
    })
  );

  off.push(dom.on(audio, "volumechange", loudness));
  audio.before(root);
  root.append(audio, button, volume, seek, error);
  audio.controls = false;
  audio.hidden = true;
  audio.preload = "metadata";
  range(root);
  loudness();

  const position = () => (Number(input.value) / 1000) * duration;

  const update = () => {
    if (Number.isFinite(audio.duration)) duration = audio.duration;
    const playing = !audio.paused && !audio.ended;

    dom.set(button, "data-icon", playing ? "pause" : "play");
    caption.textContent = i18n.message(playing ? "player.pause" : "player.play");
    root.toggleAttribute("data-playing", playing);
    root.toggleAttribute("data-error", Boolean(audio.error) || failed);
    error.hidden = !audio.error && !failed;
    button.disabled = Boolean(audio.error);
    input.disabled = !Number.isFinite(duration) || duration <= 0 || Boolean(audio.error);
    if (!moving && !probing) {
      input.value = String(
        input.disabled ? 0 : audio.ended ? 1000 : (audio.currentTime / duration) * 1000
      );

      range(root);
    }

    time.textContent = clock(probing ? 0 : moving ? position() : audio.currentTime);
    total.textContent = clock(duration);
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
      time.textContent = clock(position());
    })
  );

  off.push(
    dom.on(input, "change", () => {
      if (!input.disabled) audio.currentTime = position();

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
