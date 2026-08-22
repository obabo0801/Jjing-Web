import { mkdirSync } from "node:fs";
import path from "node:path";

import sqlite3 from "sqlite3";

const dir = path.join(import.meta.dirname, "../data");

mkdirSync(dir, { recursive: true });

const db = new sqlite3.Database(
  path.join(dir, "service.db")
);

db.configure("busyTimeout", 5000);

db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    uid TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    role INTEGER NOT NULL DEFAULT 1
      CHECK (role IN (0, 1)),
    ip TEXT NOT NULL,
    date TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE TABLE IF NOT EXISTS block (
    uid TEXT,
    ip TEXT,
    reason TEXT,
    time TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE TABLE IF NOT EXISTS push (
    uid TEXT NOT NULL,
    endpoint TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    time TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE TABLE IF NOT EXISTS tts (
    file TEXT NOT NULL,
    uid TEXT NOT NULL,
    text TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stt (
    file TEXT NOT NULL,
    uid TEXT NOT NULL,
    text TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS user_ip
    ON user (ip);

  CREATE INDEX IF NOT EXISTS block_uid
    ON block (uid);

  CREATE INDEX IF NOT EXISTS block_ip
    ON block (ip);

  CREATE INDEX IF NOT EXISTS push_uid
    ON push (uid);

  CREATE INDEX IF NOT EXISTS tts_file
    ON tts (file);

  CREATE INDEX IF NOT EXISTS tts_uid
    ON tts (uid);

  CREATE INDEX IF NOT EXISTS stt_file
    ON stt (file);

  CREATE INDEX IF NOT EXISTS stt_uid
    ON stt (uid);
`);

export const get = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.get(query, params, (error, row) => {
      if (error) {
        return reject(error);
      }

      resolve(row);
    });
  });

export const run = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function (error) {
      if (error) {
        return reject(error);
      }

      resolve({ id: this.lastID, changes: this.changes });
    });
  });

export const all = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.all(query, params, (error, rows) => {
      if (error) {
        return reject(error);
      }

      resolve(rows);
    });
  });

export default db;
