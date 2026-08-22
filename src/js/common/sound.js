import { on } from "#common/dom";
import { context, level } from "#common/audio";
import { get } from "#common/storage";
import patterns from "#common/pattern";

const files = Object.freeze({
  bell: new URL(
    "../../assets/audio/bell.mp3",
    import.meta.url
  ).href,

  click: new URL(
    "../../assets/audio/click.mp3",
    import.meta.url
  ).href,

  eoheo: new URL(
    "../../assets/audio/eoheo.mp3",
    import.meta.url
  ).href,

  pop: new URL(
    "../../assets/audio/pop.mp3",
    import.meta.url
  ).href
});

const buffers = new Map();
const media = new Map();
const tones = new Set();

let token = 0;

const load = (audio, source) => {
  if (!buffers.has(source)) {
    const request = fetch(source)
      .then((response) => {
        if (!response.ok) {
          throw new Error();
        }

        return response.arrayBuffer();
      })
      .then((data) => audio.decodeAudioData(data))
      .catch((error) => {
        buffers.delete(source);

        throw error;
      });

    buffers.set(source, request);
  }

  return buffers.get(source);
};

export function beep(
  frequency = 440,
  duration = 80,
  {
    channel = "system",
    delay = 0,
    type = "sine",
    volume = 1
  } = {}
) {
  if (get("sound", "true") === "false") {
    return null;
  }

  const audio = context();

  if (!audio) {
    return null;
  }

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const length = Math.max(1, Number(duration) || 80) / 1000;
  const start =
    audio.currentTime +
    Math.max(0, Number(delay) || 0) / 1000;
  const end = start + length;
  const attack = Math.min(0.01, length / 2);

  oscillator.frequency.setValueAtTime(
    Math.max(1, Number(frequency) || 440),
    start
  );
  oscillator.type = [
    "sine",
    "square",
    "sawtooth",
    "triangle"
  ].includes(type)
    ? type
    : "sine";

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(
    level(channel, volume),
    start + attack
  );
  gain.gain.linearRampToValueAtTime(0, end);

  oscillator.connect(gain);
  gain.connect(audio.destination);

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
      const tone = beep(frequency, duration, {
        ...options,
        delay
      });

      delay += duration + gap;

      return tone;
    })
    .filter(Boolean);
}

export async function file(
  source = "",
  { channel = "media", loop = false, volume = 1 } = {}
) {
  if (get("sound", "true") === "false") {
    return null;
  }

  const audio = context();
  const url = files[source] || source;

  if (!audio || !url) {
    return null;
  }

  const id = token;

  let buffer;

  try {
    buffer = await load(audio, url);
  } catch {
    return null;
  }

  if (id !== token || get("sound", "true") === "false") {
    return null;
  }

  const item = audio.createBufferSource();
  const gain = audio.createGain();

  item.buffer = buffer;
  item.loop = loop;
  gain.gain.value = level(channel, volume);

  item.connect(gain);
  gain.connect(audio.destination);

  media.set(item, gain);

  on(
    item,
    "ended",
    () => {
      if (!media.delete(item)) {
        return;
      }

      item.disconnect();
      gain.disconnect();
    },
    { once: true }
  );

  item.start();

  return item;
}

export function stop() {
  token += 1;

  for (const tone of tones) {
    try {
      tone.stop();
    } catch {}
  }

  tones.clear();

  for (const [item, gain] of media) {
    try {
      item.stop();
    } catch {}

    item.disconnect();
    gain.disconnect();
  }

  media.clear();
}

const methods = Object.fromEntries(
  Object.keys(patterns).map((name) => [
    name,
    (options) => play(name, options)
  ])
);

export default Object.freeze({
  beep,
  file,
  play,
  stop,
  ...methods
});
