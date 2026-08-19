import { stt as route } from "#config/route";

import root from "#common/root";
import { on } from "#common/event";
import { context } from "#common/audio";
import device from "#common/device";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const regions = { en: "en-US", ja: "ja-JP", ko: "ko-KR" };

let cloud;

const language = () => {
  const value = root.lang || navigator.language || "ko";

  const lang = value.toLowerCase();
  const base = lang.split("-")[0];

  return regions[base] || lang;
};

const available = async () => {
  if (cloud !== undefined) {
    return cloud;
  }

  try {
    const response = await fetch(`/api${route}`);

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    cloud = Boolean(data.cloud);

    return cloud;
  } catch {
    return false;
  }
};

const encode = (value) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));

  return btoa(String.fromCharCode(...bytes));
};

const frequency = (buffer) => {
  const data = buffer.getChannelData(0);
  const rate = buffer.sampleRate;

  const size = Math.min(data.length, rate);
  const start = Math.max(0, Math.floor((data.length - size) / 2));

  let power = 0;
  let count = 0;

  for (let i = start; i < start + size; i += 4) {
    power += data[i] ** 2;
    count += 1;
  }

  if (!count || Math.sqrt(power / count) < 0.01) {
    return 0;
  }

  const min = Math.floor(rate / 300);
  const max = Math.floor(rate / 80);

  let best = 0;
  let score = 0;

  for (let lag = min; lag <= max; lag += 1) {
    let value = 0;

    for (let i = start; i < start + size - lag; i += 4) {
      value += data[i] * data[i + lag];
    }

    if (value > score) {
      score = value;
      best = lag;
    }
  }

  return best ? rate / best : 0;
};

const pitch = (hz) => {
  if (!hz) {
    return "unknown";
  }

  if (hz < 130) {
    return "low";
  }

  if (hz > 210) {
    return "high";
  }

  return "mid";
};

const analyze = async (blob) => {
  const audio = context();

  if (!audio) {
    return "unknown";
  }

  try {
    const buffer = await audio.decodeAudioData(await blob.arrayBuffer());

    return pitch(frequency(buffer));
  } catch {
    return "unknown";
  }
};

const upload = async (blob, lang, text, pitch) => {
  if (!blob?.size) {
    return { text, confidence: null };
  }

  const response = await fetch(`/api${route}`, {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "audio/webm",
      "X-STT-Meta": encode({ lang, text, pitch })
    },
    body: blob
  });

  if (!response.ok) {
    return { text, confidence: null };
  }

  try {
    const data = await response.json();

    return {
      text: typeof data.text === "string" ? data.text.trim() : text,
      confidence: Number(data.confidence) > 0 ? Number(data.confidence) : null
    };
  } catch {
    return { text, confidence: null };
  }
};

const record = (stream) => {
  const chunks = [];
  const recorder = new MediaRecorder(stream);

  const done = new Promise((resolve) => {
    on(recorder, "dataavailable", (event) => {
      if (event.data.size) {
        chunks.push(event.data);
      }
    });

    on(
      recorder,
      "stop",
      () => {
        resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      },
      { once: true }
    );
  });

  recorder.start();

  return { recorder, done };
};

const listen = (lang, stream) => {
  const recognition = new SpeechRecognition();

  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let text = "";
  let confidence = 0;

  const done = new Promise((resolve) => {
    on(recognition, "result", (event) => {
      const result = event.results[event.resultIndex];
      const item = result?.[0];

      if (!item) {
        return;
      }

      text = item.transcript.trim();
      confidence = Number(item.confidence) || 0;
    });

    const finish = () => resolve({ text, confidence });

    on(recognition, "end", finish, { once: true });
    on(recognition, "error", finish, { once: true });
  });

  const track = stream?.getAudioTracks()[0];

  try {
    track ? recognition.start(track) : recognition.start();
  } catch {
    recognition.start();
  }

  return done;
};

const silence = (stream) =>
  new Promise((resolve) => {
    const audio = context();

    if (!audio) {
      setTimeout(resolve, 5000);
      return;
    }

    const source = audio.createMediaStreamSource(stream);
    const analyser = audio.createAnalyser();

    analyser.fftSize = 1024;
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);
    const start = performance.now();

    let spoken = false;
    let quiet = start;
    let frame;

    const done = () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      resolve();
    };

    const check = (time) => {
      analyser.getByteTimeDomainData(data);

      let power = 0;
      let count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const value = (data[i] - 128) / 128;

        power += value ** 2;
        count += 1;
      }

      const level = count ? Math.sqrt(power / count) : 0;

      if (level > 0.025) {
        spoken = true;
        quiet = time;
      }

      if (
        (spoken && time - quiet >= 900) ||
        (!spoken && time - start >= 5000) ||
        time - start >= 15000
      ) {
        done();
        return;
      }

      frame = requestAnimationFrame(check);
    };

    frame = requestAnimationFrame(check);
  });

const native = async (lang) => {
  if (!SpeechRecognition) {
    return { text: "", confidence: 0 };
  }

  return listen(lang);
};

const desktop = async (lang, deviceId) => {
  const stream = await microphone(deviceId);

  try {
    const saved = record(stream);
    const heard = await listen(lang, stream);

    if (saved.recorder.state !== "inactive") {
      saved.recorder.stop();
    }

    const blob = await saved.done;
    const pitch = await analyze(blob);

    const result = await upload(blob, lang, heard.text, pitch);

    return {
      text: result.text,
      confidence: result.confidence ?? heard.confidence
    };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
};

export const microphones = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  stream.getTracks().forEach((track) => track.stop());

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices
    .filter((item) => item.kind === "audioinput")
    .map((item) => ({ id: item.deviceId, name: item.label }));
};

const microphone = (deviceId) =>
  navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true
  });

const remote = async (lang, deviceId) => {
  const stream = await microphone(deviceId);

  try {
    const saved = record(stream);

    await silence(stream);

    if (saved.recorder.state !== "inactive") {
      saved.recorder.stop();
    }

    const blob = await saved.done;
    const pitch = await analyze(blob);
    const result = await upload(blob, lang, "", pitch);

    return { text: result.text, confidence: result.confidence ?? 0 };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
};

const match = (text, keywords, lang) => {
  const value = text.toLocaleLowerCase(lang);

  return keywords.some((keyword) => {
    if (typeof keyword !== "string") {
      return false;
    }

    const word = keyword.trim().toLocaleLowerCase(lang);

    return word && value.includes(word);
  });
};

export default async function voice(keywords, deviceId) {
  const lang = language();
  const base = lang.split("-")[0];

  const words = Array.isArray(keywords)
    ? keywords
    : keywords[lang] || keywords[base] || [];

  const state = device();

  try {
    let result;

    if (
      state.window &&
      SpeechRecognition &&
      window.MediaRecorder &&
      navigator.mediaDevices?.getUserMedia
    ) {
      result = await desktop(lang, deviceId);
    } else if (
      (await available()) &&
      window.MediaRecorder &&
      navigator.mediaDevices?.getUserMedia
    ) {
      result = await remote(lang, deviceId);
    } else {
      result = await native(lang);
    }

    if (!result.text) {
      return { action: "none" };
    }

    if (!match(result.text, words, lang)) {
      return { action: "none" };
    }

    return {
      action: result.confidence >= 0.8 ? "run" : "ask",
      text: result.text
    };
  } catch {
    return { action: "none" };
  }
}
