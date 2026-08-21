import { stt as route } from "#config/route";

import root from "#common/root";
import { on } from "#common/event";
import { context } from "#common/audio";
import { show } from "#common/dialog";
import { message } from "#common/i18n";
import overlay from "#common/overlay";
import sound from "#common/sound";
import device from "#common/device";

import permissionView, { confirm as permissionConfirm } from "#ui/dialog";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const regions = { en: "en-US", ja: "ja-JP", ko: "ko-KR" };

let cloud;
let current;

const views = new WeakMap();

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

const upload = async (blob, lang, text, pitch, signal) => {
  if (!blob?.size) {
    return { text, confidence: null };
  }

  const response = await fetch(`/api${route}`, {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "audio/webm",
      "X-STT-Meta": encode({ lang, text, pitch })
    },
    body: blob,
    signal
  });

  if (response.status === 204) {
    return { text, confidence: null };
  }

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

const report = (lang, text, signal) =>
  fetch(`/api${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang, text }),
    signal
  }).catch(() => null);

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

const listen = (lang, stream, target, signal, keep = false) => {
  const recognition = new SpeechRecognition();

  recognition.lang = lang;
  recognition.continuous = keep;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const track = stream?.getAudioTracks()[0];

  let text = "";
  let confidence = 0;
  let stopVoice = () => {};
  let stopped = false;
  let settled = false;
  let shown = false;
  let off = () => {};
  let resolveDone;

  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  const finish = () => {
    if (settled) {
      return;
    }

    settled = true;

    off();
    stopVoice();

    resolveDone({ text, confidence });
  };

  const start = () => {
    if (stopped || signal?.aborted) {
      return;
    }

    try {
      recognition.start();
    } catch {
      finish();
    }
  };

  on(recognition, "result", (event) => {
    const result = event.results[event.resultIndex];
    const item = result?.[0];

    if (!item) {
      return;
    }

    const value = item.transcript.trim();

    if (!value) {
      return;
    }

    if (!text || value.startsWith(text)) {
      text = value;
    } else if (!text.startsWith(value) && !text.endsWith(value)) {
      text = `${text} ${value}`.trim();
    }

    confidence = Number(item.confidence) || 0;
  });

  on(recognition, "start", () => {
    if (shown || stream) {
      return;
    }

    shown = true;
    stopVoice = active(target, stream);
  });

  on(recognition, "error", (event) => {
    if (keep && event.error === "no-speech" && !stopped && !signal?.aborted) {
      return;
    }

    stopped = true;
    finish();
  });

  on(recognition, "end", () => {
    if (keep && !stopped && !signal?.aborted) {
      setTimeout(start, 0);
      return;
    }

    finish();
  });

  off = on(
    signal,
    "abort",
    () => {
      stopped = true;

      try {
        recognition.abort();
      } catch {}

      finish();
    },
    { once: true }
  );

  start();

  return {
    done,
    stop: () => {
      if (stopped) {
        return;
      }

      stopped = true;

      try {
        recognition.stop();
      } catch {
        finish();
      }
    }
  };
};

export const meter = (stream, callback) => {
  const audio = context();

  if (!audio) {
    return () => {};
  }

  const source = audio.createMediaStreamSource(stream);
  const analyser = audio.createAnalyser();

  analyser.fftSize = 1024;
  source.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);

  let frame;

  const check = () => {
    analyser.getByteTimeDomainData(data);

    let power = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const value = (data[i] - 128) / 128;

      power += value ** 2;
      count += 1;
    }

    const level = count ? Math.sqrt(power / count) : 0;

    callback(level);

    frame = requestAnimationFrame(check);
  };

  frame = requestAnimationFrame(check);

  return () => {
    cancelAnimationFrame(frame);
    source.disconnect();
  };
};

const surface = (target) => {
  if (!(target instanceof Element)) {
    return null;
  }

  const control =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  return control
    ? target.closest(".search") || target.closest(".input") || target
    : target;
};

const status = (target, name) => {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    target.placeholder = message(name);
  }
};

const display = (target) => {
  const element = surface(target);

  if (!element) {
    return () => {};
  }

  const control =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  const action = element.querySelector(".voice");
  const view = {};
  const original = control
    ? {
        value: target.value,
        placeholder: target.placeholder,
        readOnly: target.readOnly
      }
    : null;

  views.set(element, view);
  element.setAttribute("data-voice", "");
  action?.setAttribute("data-icon", "wave");

  if (control) {
    target.value = "";
    status(target, "voice.listening");
    target.readOnly = true;
  }

  return () => {
    if (views.get(element) !== view) {
      return;
    }

    views.delete(element);
    action?.setAttribute("data-icon", "voice");
    element.removeAttribute("data-voice");

    if (control) {
      target.value = original.value;
      target.placeholder = original.placeholder;
      target.readOnly = original.readOnly;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
};

const active = (target, stream) => {
  overlay.close();
  sound.send();

  const stopDisplay = display(target);

  const element = surface(target);

  if (!element) {
    return stopDisplay;
  }

  const visual = element.querySelector(".input") || element;

  const ping = visual.animate(
    [{ outlineOffset: "-2px" }, { outlineOffset: "6px" }],
    { duration: 1000, fill: "both" }
  );

  ping.pause();

  let value = 0;

  const stopMeter = stream
    ? meter(stream, (level) => {
        const next = Math.min(Math.max((level - 0.02) * 125, 0), 1000);

        value += (next - value) * 0.15;

        ping.currentTime = value;
      })
    : () => {};

  let stopped = false;

  return () => {
    if (stopped) {
      return;
    }

    stopped = true;

    stopMeter();

    const offset = getComputedStyle(visual).outlineOffset;

    ping.cancel();

    visual.animate(
      [
        { outlineColor: "var(--active)", outlineOffset: offset },
        { outlineColor: "transparent", outlineOffset: "-6px" }
      ],
      { duration: 220, easing: "ease-in" }
    );

    stopDisplay();
  };
};

const silence = (stream, signal, stop) =>
  new Promise((resolve) => {
    const audio = context();

    if (!audio) {
      let off = () => {};
      let stopOff = () => {};
      let timer;
      let settled = false;

      const done = (spoken = false) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        off();
        stopOff();
        resolve(spoken);
      };

      timer = setTimeout(() => done(true), 5000);

      off = on(signal, "abort", () => done(false), { once: true });
      stopOff = on(stop, "abort", () => done(false), { once: true });

      if (stop?.aborted) {
        done();
      }

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
    let stopped = false;
    let off = () => {};
    let stopOff = () => {};

    const done = () => {
      if (stopped) {
        return;
      }

      stopped = true;

      cancelAnimationFrame(frame);
      off();
      stopOff();
      source.disconnect();

      resolve(spoken);
    };

    off = on(signal, "abort", done, { once: true });
    stopOff = on(stop, "abort", done, { once: true });

    if (stop?.aborted) {
      done();
      return;
    }

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
        (spoken && time - quiet >= 1200) ||
        (!spoken && time - start >= 5000) ||
        time - start >= 60_000
      ) {
        done();
        return;
      }

      frame = requestAnimationFrame(check);
    };

    frame = requestAnimationFrame(check);
  });

const native = async (lang, target, signal, stop) => {
  if (!SpeechRecognition) {
    return { text: "", confidence: 0 };
  }

  const heard = listen(lang, null, target, signal);
  const off = on(stop, "abort", heard.stop, { once: true });

  if (stop.aborted) {
    heard.stop();
  }

  try {
    return await heard.done;
  } finally {
    off();
  }
};

const desktop = async (lang, deviceId, target, signal, stop) => {
  const stream = await microphone(deviceId);

  let stopVoice = () => {};

  try {
    if (signal.aborted || stop.aborted) {
      return { text: "", confidence: 0 };
    }

    stopVoice = active(target, stream);

    const saved = record(stream);

    const heard = listen(lang, stream, target, signal, true);

    const spoken = await silence(stream, signal, stop);

    heard.stop();

    if (saved.recorder.state !== "inactive") {
      saved.recorder.stop();
    }

    const [blob, recognized] = await Promise.all([saved.done, heard.done]);

    if (signal.aborted || (!spoken && !recognized.text)) {
      return { text: "", confidence: 0 };
    }

    status(target, "voice.processing");

    const pitch = await analyze(blob);

    const result = await upload(blob, lang, recognized.text, pitch, signal);

    return {
      text: result.text,
      confidence: result.confidence ?? recognized.confidence
    };
  } finally {
    stopVoice();

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

export const stop = () => {
  if (!current) {
    return null;
  }

  current.stop();

  return current.done;
};

const microphone = (deviceId) =>
  navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true
  });

const permission = async () => {
  try {
    return await navigator.permissions?.query({ name: "microphone" });
  } catch {
    return null;
  }
};

const waitPermission = async (deviceId, signal, stop) => {
  const item = permissionView;
  const confirm = permissionConfirm;

  if (!item || !confirm) {
    return false;
  }

  show(item, { backdrop: false });

  const access = await permission();

  return new Promise((resolve) => {
    let checking = false;
    let settled = false;
    let offCancel = () => {};
    let offConfirm = () => {};
    let offAccess = () => {};
    let offFocus = () => {};
    let offSignal = () => {};
    let offStop = () => {};

    const finish = (value) => {
      if (settled) {
        return;
      }

      settled = true;
      offCancel();
      offConfirm();
      offAccess();
      offFocus();
      offSignal();
      offStop();

      if (item.open) {
        item.close();
      }

      resolve(value);
    };

    const check = async () => {
      if (checking || settled) {
        return;
      }

      checking = true;

      try {
        const state = await permission();

        if (state && state.state !== "granted") {
          return;
        }

        const stream = await microphone(deviceId);

        stream.getTracks().forEach((track) => track.stop());
        finish(true);
      } catch {
      } finally {
        checking = false;
      }
    };

    offCancel = on(item, "cancel", (event) => event.preventDefault());
    offConfirm = on(confirm, "click", () => finish(false));
    offAccess = on(access, "change", () => check());
    offFocus = on(window, "focus", () => check());
    offSignal = on(signal, "abort", () => finish(false), { once: true });
    offStop = on(stop, "abort", () => finish(false), { once: true });

    if (signal.aborted || stop.aborted) {
      finish(false);
    } else if (access?.state === "granted") {
      check();
    }
  });
};

const authorize = async (deviceId, signal, stop) => {
  const access = await permission();

  if (access?.state === "granted") {
    return true;
  }

  if (!access || access.state === "prompt") {
    overlay.open();
  }

  try {
    const stream = await microphone(deviceId);

    stream.getTracks().forEach((track) => track.stop());

    return !signal.aborted && !stop.aborted;
  } catch (error) {
    overlay.close();

    if (
      error?.name !== "NotAllowedError" &&
      error?.name !== "PermissionDeniedError"
    ) {
      return false;
    }

    return waitPermission(deviceId, signal, stop);
  } finally {
    overlay.close();
  }
};

const remote = async (lang, deviceId, target, signal, stop) => {
  const stream = await microphone(deviceId);

  let stopVoice = () => {};

  try {
    if (signal.aborted || stop.aborted) {
      return { text: "", confidence: 0 };
    }

    const saved = record(stream);

    stopVoice = active(target, stream);

    const spoken = await silence(stream, signal, stop);

    if (saved.recorder.state !== "inactive") {
      saved.recorder.stop();
    }

    const blob = await saved.done;

    if (signal.aborted || !spoken) {
      return { text: "", confidence: 0 };
    }

    status(target, "voice.processing");

    const pitch = await analyze(blob);

    const result = await upload(blob, lang, "", pitch, signal);

    return { text: result.text, confidence: result.confidence ?? 0 };
  } finally {
    stopVoice();

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

export default async function voice(keywords, options = {}) {
  if (options instanceof Element) {
    options = { target: options };
  } else if (typeof options === "string") {
    options = { deviceId: options };
  }

  if (current) {
    current.stop();

    return current.done;
  }

  const controller = new AbortController();
  const stopper = new AbortController();
  const { signal } = controller;
  const stop = stopper.signal;

  let finish;
  let output = { action: "none" };

  const done = new Promise((resolve) => {
    finish = resolve;
  });

  current = {
    stop: () => {
      if (stopper.signal.aborted) {
        controller.abort();
        return;
      }

      stopper.abort();
    },
    done
  };

  const complete = (value) => {
    output = value;

    return value;
  };

  try {
    const { deviceId, target } = options;

    if (!(await authorize(deviceId, signal, stop))) {
      return complete({ action: "none" });
    }

    const lang = language();
    const base = lang.split("-")[0];

    const words = Array.isArray(keywords)
      ? keywords
      : keywords[lang] || keywords[base] || [];

    const state = device();

    let result;

    if (
      state.window &&
      SpeechRecognition &&
      window.MediaRecorder &&
      navigator.mediaDevices?.getUserMedia
    ) {
      result = await desktop(lang, deviceId, target, signal, stop);
    } else if (
      (await available()) &&
      window.MediaRecorder &&
      navigator.mediaDevices?.getUserMedia
    ) {
      result = await remote(lang, deviceId, target, signal, stop);
    } else {
      result = await native(lang, target, signal, stop);

      if (result.text) {
        await report(lang, result.text, signal);
      }
    }

    if (signal.aborted) {
      return complete({ action: "none" });
    }

    if (!result.text) {
      sound.fail();

      return complete({ action: "none" });
    }

    sound.success();

    if (words.length && !match(result.text, words, lang)) {
      return complete({ action: "none" });
    }

    return complete({
      action: !words.length || result.confidence >= 0.8 ? "run" : "ask",
      text: result.text
    });
  } catch {
    return complete({ action: "none" });
  } finally {
    overlay.close();
    finish(output);

    if (current?.done === done) {
      current = undefined;
    }
  }
}
