import { readdir } from "node:fs/promises";
import path from "node:path";

import sqlite3 from "sqlite3";

const dir = path.join(
  import.meta.dirname,
  "../../data/log/access"
);

const read = (file, uid) =>
  new Promise((resolve) => {
    const db = new sqlite3.Database(
      file,
      sqlite3.OPEN_READONLY
    );

    db.get(
      `
      SELECT ip, os, time
      FROM access
      WHERE uid = ?
      ORDER BY time DESC
      LIMIT 1
    `,
      [uid],
      (error, row) => {
        db.close(() => resolve(error ? null : row));
      }
    );
  });

export default async function recent(uid) {
  let files;

  try {
    files = (await readdir(dir))
      .filter((file) => /^\d{8}\.db$/.test(file))
      .sort()
      .reverse();
  } catch {
    return null;
  }

  for (const file of files) {
    const value = await read(path.join(dir, file), uid);

    if (value) {
      return value;
    }
  }

  return null;
}
