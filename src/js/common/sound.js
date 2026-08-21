import { on } from "#common/event";
import { context, level } from "#common/audio";
import { get } from "#common/storage";
import patterns from "#common/pattern";

import eoheo from "#audio/eoheo.mp3";

const files = Object.freeze({ eoheo });
const waves = ["sine", "square", "sawtooth", "triangle"];

const media = new Set();
const tones = new Set();

export function beep(
  frequency = 440,
  duration = 80,
  { channel = "system", delay = 0, type = "sine", volume = 1 } = {}
) {
  if (get("sound", "true") === "false") {
    return null;
  }

  const current = context();

  if (!current) {
    return null;
  }

  const oscillator = current.createOscillator();
  const gain = current.createGain();
  const length = Math.max(1, Number(duration) || 80) / 1000;
  const start = current.currentTime + Math.max(0, Number(delay) || 0) / 1000;
  const end = start + length;
  const attack = Math.min(0.01, length / 2);

  oscillator.frequency.setValueAtTime(
    Math.max(1, Number(frequency) || 440),
    start
  );
  oscillator.type = waves.includes(type) ? type : "sine";

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(level(channel, volume), start + attack);
  gain.gain.linearRampToValueAtTime(0, end);

  oscillator.connect(gain);
  gain.connect(current.destination);

  tones.add(oscillator);

  on(
    oscillator,
    "ended",
    () => {
      tones.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    },
    { once: true }
  );

  oscillator.start(start);
  oscillator.stop(end);

  return oscillator;
}

export function play(name, options = {}) {
  const pattern = patterns[name];

  if (!pattern) {
    return [];
  }

  let delay = Number(options.delay) || 0;

  return pattern
    .map(([frequency, duration, gap]) => {
      const tone = beep(frequency, duration, { ...options, delay });

      delay += duration + gap;

      return tone;
    })
    .filter(Boolean);
}

export function file(
  source = "",
  { channel = "media", loop = false, volume = 1 } = {}
) {
  if (typeof Audio === "undefined" || get("sound", "true") === "false") {
    return null;
  }

  const item = new Audio(files[source] || source);

  item.loop = loop;
  item.volume = level(channel, volume);

  media.add(item);

  const clear = () => {
    media.delete(item);
  };

  on(item, "ended", clear, { once: true });
  on(item, "error", clear, { once: true });

  item.play().catch(clear);

  return item;
}

export function stop() {
  for (const tone of tones) {
    try {
      tone.stop();
    } catch {}
  }

  tones.clear();

  for (const item of media) {
    item.pause();
    item.currentTime = 0;
  }

  media.clear();
}

const methods = Object.fromEntries(
  Object.keys(patterns).map((name) => [name, (options) => play(name, options)])
);

export default Object.freeze({ beep, file, play, stop, ...methods });
