import { mkdirSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";

import hash from "#config/hash";
import { run } from "#config/sqlite";

const dir = path.join(import.meta.dirname, "../data/stt");

const types = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };

const query = "INSERT INTO stt (file, uid, text, time) VALUES (?, ?, ?, ?)";

export const supported = (type) => Object.hasOwn(types, type);

mkdirSync(dir, { recursive: true });

export default async function save(audio, type, uid, text, time) {
  const ext = types[type];

  if (!ext || !Buffer.isBuffer(audio)) {
    return null;
  }

  const id = hash(32, audio);

  const file = `${id}.${ext}`;
  const target = path.join(dir, file);

  try {
    await writeFile(target, audio, { flag: "wx" });
  } catch (error) {
    if (error.code === "EEXIST") {
      return file;
    }

    throw error;
  }

  try {
    await run(query, [file, uid, text, time]);
  } catch (error) {
    try {
      await rm(target, { force: true });
    } catch {}

    throw error;
  }

  return file;
}
