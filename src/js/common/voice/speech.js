import * as dom from "#common/dom";
import { visualize } from "#common/voice/view";

const SpeechRecognition = Reflect.get(
  window,
  "SpeechRecognition"
);

export const supported = Boolean(SpeechRecognition);

export const listen = (
  lang,
  stream,
  target,
  signal,
  keep = false
) => {
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = lang;
  recognition.continuous = keep;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let text = "";
  let confidence = 0;
  let stopVisual = () => {};
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
    stopVisual();

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

  dom.on(recognition, "result", (event) => {
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
    } else if (
      !text.startsWith(value) &&
      !text.endsWith(value)
    ) {
      text = `${text} ${value}`.trim();
    }

    confidence = Number(item.confidence) || 0;
  });

  dom.on(recognition, "start", () => {
    if (shown || stream) {
      return;
    }

    shown = true;

    stopVisual = visualize(target, stream);
  });

  dom.on(recognition, "error", (event) => {
    if (
      keep &&
      event.error === "no-speech" &&
      !stopped &&
      !signal?.aborted
    ) {
      return;
    }

    stopped = true;
    finish();
  });

  dom.on(recognition, "end", () => {
    if (keep && !stopped && !signal?.aborted) {
      setTimeout(start, 0);
      return;
    }

    finish();
  });

  off = dom.on(
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

export const native = async (
  lang,
  target,
  signal,
  stop
) => {
  if (!SpeechRecognition) {
    return { text: "", confidence: 0 };
  }

  const heard = listen(lang, null, target, signal);

  const off = dom.on(stop, "abort", heard.stop, {
    once: true
  });

  if (stop.aborted) {
    heard.stop();
  }

  try {
    return await heard.done;
  } finally {
    off();
  }
};
