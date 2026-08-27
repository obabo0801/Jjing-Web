import * as dom from "#common/dom";
import { preload } from "#common/i18n";
import device from "#common/device";
import sound from "#common/sound";

import * as server from "#common/voice/server";
import * as audio from "#common/voice/audio";
import * as media from "#common/voice/media";
import * as speech from "#common/voice/speech";
import * as view from "#common/voice/view";

export { meter } from "#common/voice/audio";
export { microphones } from "#common/voice/media";

const regions = { en: "en-US", ja: "ja-JP", ko: "ko-KR" };

preload("voice.listening", "voice.processing");

let session;

const language = () => {
  const value = dom.root.lang || navigator.language || "ko";

  const lang = value.toLowerCase();
  const base = lang.split("-")[0];

  return regions[base] || lang;
};

const desktop = async (
  lang,
  deviceId,
  target,
  signal,
  stop
) => {
  const stream = await media.microphone(deviceId);

  let stopVisual = () => {};

  try {
    if (signal.aborted || stop.aborted) {
      return { text: "", confidence: 0 };
    }

    stopVisual = view.visualize(target, stream);

    const saved = media.record(stream);

    const heard = speech.listen(
      lang,
      stream,
      target,
      signal,
      true
    );

    const spoken = await audio.silence(
      stream,
      signal,
      stop
    );

    heard.stop();

    if (saved.recorder.state !== "inactive") {
      saved.recorder.stop();
    }

    const [blob, recognized] = await Promise.all([
      saved.done,
      heard.done
    ]);

    if (signal.aborted || (!spoken && !recognized.text)) {
      return { text: "", confidence: 0 };
    }

    view.status(target, "voice.processing");

    const pitch = await audio.analyze(blob);

    const result = await server.upload(
      blob,
      lang,
      recognized.text,
      pitch,
      signal
    );

    return {
      text: result.text,
      confidence: result.confidence ?? recognized.confidence
    };
  } finally {
    stopVisual();
    media.close(stream);
  }
};

const remote = async (
  lang,
  deviceId,
  target,
  signal,
  stop
) => {
  const stream = await media.microphone(deviceId);

  let stopVisual = () => {};

  try {
    if (signal.aborted || stop.aborted) {
      return { text: "", confidence: 0 };
    }

    const saved = media.record(stream);

    stopVisual = view.visualize(target, stream);

    const spoken = await audio.silence(
      stream,
      signal,
      stop
    );

    if (saved.recorder.state !== "inactive") {
      saved.recorder.stop();
    }

    const blob = await saved.done;

    if (signal.aborted || !spoken) {
      return { text: "", confidence: 0 };
    }

    view.status(target, "voice.processing");

    const pitch = await audio.analyze(blob);

    const result = await server.upload(
      blob,
      lang,
      "",
      pitch,
      signal
    );

    return {
      text: result.text,
      confidence: result.confidence ?? 0
    };
  } finally {
    stopVisual();
    media.close(stream);
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

export const stop = () => {
  if (!session) {
    return null;
  }

  session.stop();

  return session.done;
};

export default async function voice(
  keywords,
  options = {}
) {
  if (options instanceof Element) {
    options = { target: options };
  } else if (typeof options === "string") {
    options = { deviceId: options };
  }

  if (session) {
    session.stop();

    return session.done;
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

  session = {
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

    const allowed = await media.authorize(
      deviceId,
      signal,
      stop
    );

    if (!allowed) {
      return complete({ action: "none" });
    }

    const lang = language();
    const base = lang.split("-")[0];

    const words = Array.isArray(keywords)
      ? keywords
      : keywords?.[lang] || keywords?.[base] || [];

    const state = device();

    let result;

    if (
      state.window &&
      speech.supported &&
      window.MediaRecorder &&
      navigator.mediaDevices?.getUserMedia
    ) {
      result = await desktop(
        lang,
        deviceId,
        target,
        signal,
        stop
      );
    } else if (
      (await server.available()) &&
      window.MediaRecorder &&
      navigator.mediaDevices?.getUserMedia
    ) {
      result = await remote(
        lang,
        deviceId,
        target,
        signal,
        stop
      );
    } else {
      result = await speech.native(
        lang,
        target,
        signal,
        stop
      );

      if (result.text) {
        await server.report(lang, result.text, signal);
      }
    }

    if (signal.aborted) {
      return complete({ action: "none" });
    }

    if (!result.text) {
      sound.play("fail");

      return complete({ action: "none" });
    }

    sound.play("success");

    if (words.length && !match(result.text, words, lang)) {
      return complete({ action: "none" });
    }

    return complete({
      action:
        !words.length || result.confidence >= 0.8
          ? "run"
          : "ask",

      text: result.text
    });
  } catch {
    return complete({ action: "none" });
  } finally {
    finish(output);

    if (session?.done === done) {
      session = undefined;
    }
  }
}
