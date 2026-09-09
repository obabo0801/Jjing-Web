import { DatabaseSync } from "node:sqlite";

import schema from "#db/schema";

export const db = new DatabaseSync(":memory:");

db.exec(schema);

export const get = async (sql, params = []) => db.prepare(sql).get(...params);

export const run = async (sql, params = []) => {
  try {
    return db.prepare(sql).run(...params);
  } catch (error) {
    if (error.code === "ERR_SQLITE_ERROR" && (error.errcode & 255) === 19) {
      error.code = "SQLITE_CONSTRAINT";
    }
    throw error;
  }
};

export const calls = {
  messages: [],
  management: [],
  images: [],
  error: null,
  image: null
};

export const reset = () => {
  db.exec(
    "DELETE FROM draft; DELETE FROM authority; DELETE FROM block; DELETE FROM user;"
  );
  calls.messages.length = 0;
  calls.management.length = 0;
  calls.images.length = 0;
  calls.error = null;
  calls.image = { original: "/original.webp", resizing: "/avatar.webp" };
};

export const send = (uid, type, data) =>
  calls.messages.push({ uid, type, data });

export const broadcast = (type, data) => calls.messages.push({ type, data });

export const state = () => "online";

export const recent = async () => ({
  time: "2026-09-08 10:00:00",
  os: "test-os",
  browser: "test-browser"
});

export const management = async (...args) => {
  calls.management.push(args);
  if (calls.error) throw calls.error;
  return { role: 0 };
};

export const store = async (...args) => {
  calls.images.push(args);
  return calls.image;
};

export const transform = async (body) => Buffer.from(body);
