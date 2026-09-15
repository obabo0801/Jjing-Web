import { AsyncLocalStorage } from "node:async_hooks";
import migrateRooms from "#db/room";
import * as path from "#config/path";

import connect from "#db/connect";
import schema from "#db/schema";

path.mkdirSync(path.data(), { recursive: true });

const connection = connect(path.data("service.db"));

await connection.exec("PRAGMA journal_mode = WAL;");
await connection.exec("PRAGMA secure_delete = ON;");
await connection.exec(schema);

const messages = await connection.all("PRAGMA table_info(message)");

for (const name of ["read", "attachments", "audio", "deleted", "room", "system"]) {
  if (!messages.some((column) => column.name === name))
    await connection.exec(`ALTER TABLE message ADD COLUMN ${name} TEXT`);
}

await migrateRooms(connection);

const columns = await connection.all("PRAGMA table_info(user)");

for (const name of ["google", "renamed", "settings"]) {
  if (!columns.some((column) => column.name === name))
    await connection.exec(`ALTER TABLE user ADD COLUMN ${name} TEXT`);
}

for (const [name, type] of Object.entries({
  deletion: "INTEGER",
  recovery: "TEXT",
  recovery_until: "INTEGER",
  erased: "INTEGER NOT NULL DEFAULT 0"
})) {
  if (!columns.some((column) => column.name === name))
    await connection.exec(`ALTER TABLE user ADD COLUMN ${name} ${type}`);
}

const web = await connection.all("PRAGMA table_info(web)");
const report = await connection.all("PRAGMA table_info(report)");

if (!report.some((column) => column.name === "snapshot"))
  await connection.exec("ALTER TABLE report ADD COLUMN snapshot TEXT");

for (const [name, type] of Object.entries({
  id: "TEXT",
  name: "TEXT",
  device: "TEXT",
  os: "TEXT",
  browser: "TEXT",
  active: "INTEGER NOT NULL DEFAULT 1",
  connected: "INTEGER NOT NULL DEFAULT 1"
})) {
  if (!web.some((column) => column.name === name))
    await connection.exec(`ALTER TABLE web ADD COLUMN ${name} ${type}`);
}

if (!web.some((column) => column.name === "os")) {
  const rows = await connection.all("SELECT endpoint, name FROM web");
  const pattern =
    /^(Windows|macOS|Linux|Android|iOS|Wearable|Chrome OS|Unknown) · (Chrome|Edge|Chromium|Firefox|Safari|Samsung Internet|Unknown)$/;

  for (const row of rows) {
    const match = pattern.exec(row.name || "");

    if (match)
      await connection.run("UPDATE web SET os = ?, browser = ?, name = NULL WHERE endpoint = ?", [
        match[1],
        match[2],
        row.endpoint
      ]);
  }
}

await connection.run("UPDATE web SET id = lower(hex(randomblob(16))) WHERE id IS NULL");
await connection.exec("CREATE UNIQUE INDEX IF NOT EXISTS web_id ON web (id)");
await connection.exec("CREATE UNIQUE INDEX IF NOT EXISTS user_google ON user (google)");

await connection.run("UPDATE user SET name = NULL WHERE google IS NULL AND name IS NOT NULL");

// 서버 시작 시 퇴장 제한과 채팅 금지 횟수를 초기화합니다.
// 남은 채팅 금지 시간과 제재 이력은 유지합니다.
await connection.run(
  "UPDATE sanction SET kicked = NULL, count = 0 WHERE kicked IS NOT NULL OR count <> 0"
);

const context = new AsyncLocalStorage();

let pending = Promise.resolve();

const schedule = (run) => {
  if (context.getStore()) return run();
  const next = pending.then(run);

  pending = next.catch(() => {});

  return next;
};

export const get = (...args) => schedule(() => connection.get(...args));
export const run = (...args) => schedule(() => connection.run(...args));
export const all = (...args) => schedule(() => connection.all(...args));
export const transaction = (work) =>
  schedule(() =>
    context.run(true, async () => {
      await connection.exec("BEGIN IMMEDIATE");
      try {
        const result = await work();

        await connection.exec("COMMIT");

        return result;
      } catch (error) {
        await connection.exec("ROLLBACK");
        throw error;
      }
    })
  );

export default connection.db;
