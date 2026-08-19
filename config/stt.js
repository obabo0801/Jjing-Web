import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { run } from "#config/sqlite";

const dir = path.join(import.meta.dirname, "../data/stt");

const types = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };

export const supported = (type) => Object.hasOwn(types, type);

mkdirSync(dir, { recursive: true });

export default async function save(audio, type, uid, text, time) {
  const ext = types[type];

  if (!ext || !Buffer.isBuffer(audio)) {
    return null;
  }

  const hash = createHash("sha256").update(audio).digest("hex").slice(0, 32);

  const file = `${hash}.${ext}`;
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
    await run(
      `
      INSERT INTO stt (
        file, uid, text, time
      )
      VALUES (?, ?, ?, ?)
    `,
      [file, uid, text, time]
    );
  } catch (error) {
    try {
      await rm(target, { force: true });
    } catch {}

    throw error;
  }

  return file;
}
