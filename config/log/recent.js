import sqlite3 from "sqlite3";

import * as path from "#config/path";

const dir = path.access();

const read = (file, uid) =>
  new Promise((resolve) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY);

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
    files = (await path.readdir(dir))
      .filter((file) => /^\d{8}\.db$/.test(file))
      .sort()
      .reverse();
  } catch {
    return null;
  }

  for (const file of files) {
    const value = await read(path.access(file), uid);

    if (value) {
      return value;
    }
  }

  return null;
}
