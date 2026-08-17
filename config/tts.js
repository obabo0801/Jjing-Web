import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sqlite3 from "sqlite3";

import {
  TextToSpeechClient
} from "@google-cloud/text-to-speech";

const host = "https://translate.google.com";
const dir = path.join(
  import.meta.dirname, "../data/tts"
);

const regions = {
  en: "en-US", ja: "ja-JP", ko: "ko-KR"
};

const mode = (process.env.TTS || "")
  .trim()
  .toLowerCase();

const keyFile = process.env
  .GOOGLE_APPLICATION_CREDENTIALS?.trim();

const enabled = ["login", "json"].includes(mode);
const pending = new Map();

let client;
let retry = 0;

mkdirSync(dir, { recursive: true });

const db = new sqlite3.Database(
  path.join(dir, "tts.db")
);

db.configure("busyTimeout", 5000);

db.exec(`
  CREATE TABLE IF NOT EXISTS tts (
    file TEXT NOT NULL,
    uid TEXT NOT NULL,
    text TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS tts_file
    ON tts (file);

  CREATE INDEX IF NOT EXISTS tts_uid
    ON tts (uid);
`);

const run = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function (error) {
      if (error) {
        return reject(error);
      }

      resolve({
        id: this.lastID,
        changes: this.changes
      });
    });
  });

const record = (file, uid, text, time) =>
  run(`
    INSERT INTO tts (
      file, uid, text, time
    )
    VALUES (?, ?, ?, ?)
  `, [file, uid, text, time]);

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const within = async (promise) => {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error()), 5000);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const language = (value) => {
  const lang = typeof value === "string"
    ? value.trim()
    : "";

  if (!/^[a-z]{2,3}(?:-[a-z]{2})?$/i.test(lang)) {
    return "ko-KR";
  }

  const [base, region] = lang.split("-");
  const code = base.toLowerCase();

  if (!region) {
    return regions[code] || code;
  }

  return `${code}-${region.toUpperCase()}`;
};

const options = (value) => {
  const rate = Number(value.rate);
  const pitch = Number(value.pitch);
  const voice = typeof value.voice === "string" &&
    /^[a-z0-9-]{1,100}$/i.test(value.voice)
      ? value.voice
      : undefined;

  return {
    text: value.text,
    lang: language(value.lang),
    rate: Number.isFinite(rate)
      ? clamp(rate, 0.25, 2)
      : 1,
    pitch: Number.isFinite(pitch)
      ? clamp(pitch, -20, 20)
      : 0,
    voice
  };
};

const parts = (text) => {
  const chars = [...text];
  const result = [];

  while (chars.length) {
    result.push(chars.splice(0, 180).join(""));
  }

  return result;
};

const cacheKey = (provider, value) => {
  if (provider !== "google") {
    return value;
  }

  return {
    text: value.text,
    lang: value.lang,
    rate: value.rate < 0.75 ? 0.24 : 1
  };
};

const name = (provider, value) => {
  const key = cacheKey(provider, value);

  const hash = createHash("sha256")
    .update(JSON.stringify({ provider, ...key }))
    .digest("hex")
    .slice(0, 32);

  return `${hash}.mp3`;
};

const read = async (file) => {
  try {
    return await readFile(path.join(dir, file));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    return null;
  }
};

const find = async (provider, value) => {
  const file = name(provider, value);
  const audio = await read(file);

  if (!audio) {
    return null;
  }

  return { audio, file, provider, cached: true };
};

const cache = async (
  provider, value, create, uid, time
) => {
  const file = name(provider, value);
  const saved = await find(provider, value);

  if (saved) {
    return saved;
  }

  let task = pending.get(file);
  const cached = Boolean(task);

  if (!task) {
    task = create()
      .then(async (audio) => {
        await writeFile(path.join(dir, file), audio);
        await record(file, uid, value.text, time);

        return audio;
      })
      .finally(() => pending.delete(file));

    pending.set(file, task);
  }

  return { audio: await task, file, provider, cached };
};

const connect = () => {
  if (mode === "json") {
    if (!keyFile) {
      throw new Error("TTS key is missing");
    }

    return new TextToSpeechClient({
      keyFilename: keyFile
    });
  }

  return new TextToSpeechClient();
};

const cloud = async (value) => {
  client ||= connect();

  await within(client.initialize());

  const [response] = await client.synthesizeSpeech(
    {
      input: { text: value.text },
      voice: {
        languageCode: value.lang,
        ...(value.voice && {
          name: value.voice
        })
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: value.rate,
        pitch: value.pitch
      }
    },
    { timeout: 5000 }
  );

  const audio = response.audioContent;

  if (!audio) {
    throw new Error("Cloud TTS failed");
  }

  return typeof audio === "string"
    ? Buffer.from(audio, "base64")
    : Buffer.from(audio);
};

const google = async (value) => {
  const audio = [];

  for (const text of parts(value.text)) {
    const url = new URL("/translate_tts", host);

    url.search = new URLSearchParams({
      client: "tw-ob",
      ie: "UTF-8",
      q: text,
      tl: value.lang.split("-")[0],
      ttsspeed: value.rate < 0.75
        ? "0.24"
        : "1"
    });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      signal: AbortSignal.timeout(5000)
    });

    const type = response.headers.get(
      "content-type"
    );

    if (!response.ok || !type?.startsWith("audio/")) {
      throw new Error("Google TTS failed");
    }

    audio.push(
      Buffer.from(await response.arrayBuffer())
    );
  }

  return Buffer.concat(audio);
};

const fallback = (request, uid, time) =>
  cache("google", request, () =>
    google(request), uid, time
  );

export default async function synthesize(
  value, uid, time
) {
  const request = options(value);
  const saved = await find("cloud", request);

  if (saved) {
    return saved;
  }

  if (enabled && Date.now() >= retry) {
    try {
      return await cache("cloud", request, () =>
        cloud(request), uid, time
      );
    } catch {
      try {
        await client?.close();
      } catch {}

      client = undefined;
      retry = Date.now() + 60_000;
    }
  }

  return fallback(request, uid, time);
}
