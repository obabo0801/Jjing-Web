import { tts as route } from "#config/route";

import root from "#common/root";
import { on } from "#common/event";
import { context, level } from "#common/audio";

const requests = new Set();
const sources = new Map();

let version = 0;

export async function speak(
  text,
  {
    lang = root.lang,
    pitch = 0,
    rate = 1,
    voice,
    volume = 1
  } = {}
) {
  const value = typeof text === "string"
    ? text.trim()
    : "";

  if (!value) {
    return null;
  }

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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: value,
        lang,
        pitch,
        rate,
        voice
      }),
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

    on(source, "ended", () => {
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
}

export function stop() {
  version += 1;

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

export default Object.freeze(
  Object.assign(speak, { stop })
);
