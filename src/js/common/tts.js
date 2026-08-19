import { tts as route } from "#config/route";

import root from "#common/root";
import { on } from "#common/event";
import { context, level } from "#common/audio";

const requests = new Set();
const sources = new Map();

let version = 0;

const synth = window.speechSynthesis;

export const voices = () => synth?.getVoices() || [];

const browser = async (text, { lang, pitch, rate, voice, volume }) => {
  if (!synth) {
    return null;
  }

  const speech = new SpeechSynthesisUtterance(text);

  const selected = voices().find((item) => item.name === voice);

  speech.lang = lang;
  speech.pitch = pitch;
  speech.rate = rate;
  speech.volume = level("tts", volume);
  speech.voice = selected || null;

  synth.speak(speech);

  try {
    await fetch(`/api${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice: selected?.name || "default",
        type: "browser"
      })
    });
  } catch {}

  return speech;
};

const remote = async (text, { lang, pitch, rate, voice, volume, type }) => {
  const audio = context();

  if (!audio) {
    return null;
  }

  const controller = new AbortController();
  const current = version;

  requests.add(controller);

  try {
    const response = await fetch(`/api${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang, pitch, rate, voice, type }),
      signal: controller.signal
    });

    if (!response.ok || current !== version) {
      return null;
    }

    const data = await response.arrayBuffer();

    if (current !== version) {
      return null;
    }

    const buffer = await audio.decodeAudioData(data);

    if (current !== version) {
      return null;
    }

    const source = audio.createBufferSource();
    const gain = audio.createGain();

    source.buffer = buffer;
    gain.gain.value = level("tts", volume);

    source.connect(gain);
    gain.connect(audio.destination);

    sources.set(source, gain);

    on(
      source,
      "ended",
      () => {
        if (sources.delete(source)) {
          source.disconnect();
          gain.disconnect();
        }
      },
      { once: true }
    );

    source.start();

    return source;
  } catch {
    return null;
  } finally {
    requests.delete(controller);
  }
};

export async function speak(
  text,
  { lang = root.lang, pitch = 0, rate = 1, voice, volume = 1, type } = {}
) {
  const value = typeof text === "string" ? text.trim() : "";

  if (!value) {
    return null;
  }

  const option = { lang, pitch, rate, voice, volume };

  if (type === "browser" || (!type && voice)) {
    return browser(value, option);
  }

  if (type === "cloud" || type === "google") {
    return remote(value, { ...option, type });
  }

  const cloud = await remote(value, { ...option, type: "cloud" });

  if (cloud) {
    return cloud;
  }

  const local = await browser(value, option);

  if (local) {
    return local;
  }

  return remote(value, { ...option, type: "google" });
}

export function stop() {
  version += 1;

  synth?.cancel();

  for (const request of requests) {
    request.abort();
  }

  requests.clear();

  for (const [source, gain] of sources) {
    sources.delete(source);

    try {
      source.stop();
    } catch {}

    source.disconnect();
    gain.disconnect();
  }
}

export default Object.freeze(Object.assign(speak, { stop }));
