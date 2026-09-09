import { DatabaseSync } from "node:sqlite";

export const db = new DatabaseSync(":memory:");
export const records = [];

db.exec(`
  CREATE TABLE user (
    uid TEXT PRIMARY KEY,
    role INTEGER NOT NULL DEFAULT 0,
    ip TEXT,
    initial TEXT,
    lang TEXT
  );
  CREATE TABLE block (
    uid TEXT,
    ip TEXT,
    reason TEXT,
    time TEXT NOT NULL DEFAULT '2026-01-01 00:00:00',
    log INTEGER NOT NULL DEFAULT 0
  );
`);

export const get = (query, params = []) => db.prepare(query).get(...params);
export const run = (query, params = []) => {
  const result = db.prepare(query).run(...params);

  return {
    changes: Number(result.changes),
    id: Number(result.lastInsertRowid)
  };
};

export default (...args) => records.push(args);
