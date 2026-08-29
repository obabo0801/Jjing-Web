import { mkdirSync } from "node:fs";
import path from "node:path";

import sqlite3 from "sqlite3";

const root = path.join(import.meta.dirname, "../data/log");

const offset = 9 * 60 * 60 * 1000;

export const now = () => {
  const value = Date.now() + offset;

  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
};

const date = (time) => {
  const value = time || now();

  return value.slice(0, 10).replaceAll("-", "");
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
    db = new sqlite3.Database(path.join(folder, `${day}.db`));
    db.configure("busyTimeout", 5000);
    db.exec(`
      PRAGMA journal_mode = WAL;

      ${schema}
    `);

    return db;
  };

  return (query, params = [], time) =>
    new Promise((resolve, reject) => {
      open(time).run(query, params, function (error) {
        if (error) {
          return reject(error);
        }

        resolve({ id: this.lastID, changes: this.changes });
      });
    });
}
