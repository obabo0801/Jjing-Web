import { tts as route } from "#config/route";

import * as dom from "#common/dom";
import { context, level } from "#common/audio";

const buffers = new Map();
const logged = new Set();
const requests = new Set();
const sources = new Map();

let token = 0;

const synth = window.speechSynthesis;

export const busy = () =>
  Boolean(requests.size || sources.size || synth?.speaking || synth?.pending);

const key = (text, { lang, pitch, rate, voice, type }) =>
  JSON.stringify({
    text,
    lang,
    pitch,
    rate,
    voice: voice || "",
    type: type || ""
  });

const record = (text, options) => {
  const id = key(text, options);

  if (logged.has(id)) {
    return;
  }

  logged.add(id);
  fetch(`/api${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: options.voice, type: "browser" })
  })
    .then((response) => {
      if (!response.ok) {
        logged.delete(id);
      }
    })
    .catch(() => {
      logged.delete(id);
    });
};

export const voices = () => synth?.getVoices() || [];

const browser = (text, options, report = true) => {
  if (!synth) {
    return null;
  }

  const { lang, pitch, rate, voice, volume } = options;

  const speech = new SpeechSynthesisUtterance(text);

  const selected = voices().find((item) => item.name === voice);

  const name = selected?.name || "default";
  speech.lang = lang;
  speech.pitch = pitch;
  speech.rate = rate;
  speech.volume = level("tts", volume);
  speech.voice = selected || null;
  synth.speak(speech);

  if (report) {
    record(text, { ...options, voice: name, type: "browser" });
  }

  return speech;
};

const load = (audio, text, options) => {
  const id = key(text, options);

  if (!buffers.has(id)) {
    const controller = new AbortController();
    requests.add(controller);

    const request = fetch(`/api${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        lang: options.lang,
        pitch: options.pitch,
        rate: options.rate,
        voice: options.voice,
        type: options.type
      }),
      signal: controller.signal
    })
      .then((response) => {
        if (response.status === 204) {
          return null;
        }

        if (!response.ok) {
          throw new Error();
        }

        return response.arrayBuffer();
      })
      .then((data) => (data ? audio.decodeAudioData(data) : null))
      .catch((error) => {
        buffers.delete(id);

        throw error;
      })
      .finally(() => {
        requests.delete(controller);
      });
    buffers.set(id, request);
  }

  return buffers.get(id);
};

const remote = async (text, options) => {
  const audio = context();

  if (!audio) {
    return null;
  }

  const id = token;

  let buffer;

  try {
    buffer = await load(audio, text, options);
  } catch {
    return null;
  }

  if (!buffer || id !== token) {
    return null;
  }

  const source = audio.createBufferSource();
  const gain = audio.createGain();
  source.buffer = buffer;
  gain.gain.value = level("tts", options.volume);
  source.connect(gain);
  gain.connect(audio.destination);
  sources.set(source, gain);
  dom.on(
    source,
    "ended",
    () => {
      if (!sources.delete(source)) {
        return;
      }

      source.disconnect();
      gain.disconnect();
    },
    { once: true }
  );
  source.start();

  return source;
};

export async function speak(
  text,
  { lang = dom.root.lang, pitch = 0, rate = 1, voice, volume = 1, type } = {}
) {
  const value = typeof text === "string" ? text.trim() : "";

  if (!value) {
    return null;
  }

  const options = { lang, pitch, rate, voice, volume };

  if (type === "cache") {
    const saved = await remote(value, { ...options, type });

    return saved || browser(value, options, false);
  }

  if (type === "browser" || (!type && voice)) {
    return browser(value, options);
  }

  if (type === "cloud" || type === "google") {
    return remote(value, { ...options, type });
  }

  const cloud = await remote(value, { ...options, type: "cloud" });

  if (cloud) {
    return cloud;
  }

  const local = browser(value, options);

  if (local) {
    return local;
  }

  return remote(value, { ...options, type: "google" });
}

export const wait = (source) =>
  new Promise((resolve) => {
    if (!source) {
      resolve();
      return;
    }

    const event = "onend" in source ? "end" : "ended";
    dom.on(source, event, resolve, { once: true });
    dom.on(source, "error", resolve, { once: true });
  });

export function stop() {
  token += 1;
  synth?.cancel();

  for (const request of requests) {
    request.abort();
  }

  requests.clear();

  for (const [source, gain] of sources) {
    try {
      source.stop();
    } catch {}

    source.disconnect();
    gain.disconnect();
  }

  sources.clear();
}
