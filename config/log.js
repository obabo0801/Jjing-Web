import { mkdirSync } from "node:fs";
import path from "node:path";

import sqlite3 from "sqlite3";

const root = path.join(
  import.meta.dirname, "../data/log"
);

const date = (time) => {
  if (time) {
    return time
      .slice(0, 10)
      .replaceAll("-", "");
  }

  return new Date(Date.now() + 32_400_000)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
};

export default function log(dir, schema) {
  const folder = path.join(root, dir);

  mkdirSync(folder, { recursive: true });

  let day;
  let db;

  const open = (time) => {
    const next = date(time);

    if (db && day === next) {
      return db;
    }

    db?.close();

    day = next;

    db = new sqlite3.Database(
      path.join(folder, `${day}.db`)
    );

    db.configure("busyTimeout", 5000);
    db.exec(schema);

    return db;
  };

  return (query, params = [], time) =>
    new Promise((resolve, reject) => {
      open(time).run(query, params, function (error) {
        if (error) {
          return reject(error);
        }

        resolve({
          id: this.lastID,
          changes: this.changes
        });
      });
    });
}
