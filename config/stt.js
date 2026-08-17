import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import sqlite3 from "sqlite3";

const dir = path.join(
  import.meta.dirname, "../data/stt"
);

const types = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a"
};

export const supported = (type) =>
  Object.hasOwn(types, type);

mkdirSync(dir, { recursive: true });

const db = new sqlite3.Database(
  path.join(dir, "stt.db")
);

db.configure("busyTimeout", 5000);

db.exec(`
  CREATE TABLE IF NOT EXISTS stt (
    file TEXT NOT NULL,
    uid TEXT NOT NULL,
    text TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS stt_file
    ON stt (file);

  CREATE INDEX IF NOT EXISTS stt_uid
    ON stt (uid);
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

export default async function save(
  audio, type, uid, text, time
) {
  const ext = types[type];

  if (!ext || !Buffer.isBuffer(audio)) {
    return null;
  }

  const hash = createHash("sha256")
    .update(audio)
    .digest("hex")
    .slice(0, 32);

  const file = `${hash}.${ext}`;
  const target = path.join(dir, file);

  try {
    await writeFile(
      target, audio, { flag: "wx" }
    );

    await run(`
      INSERT INTO stt (
        file, uid, text, time
      )
      VALUES (?, ?, ?, ?)
    `, [file, uid, text, time]);
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }

  return file;
}
