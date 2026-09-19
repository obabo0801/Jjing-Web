import sqlite3 from "sqlite3";
import * as fs from "node:fs/promises";
import * as path from "#config/path";

const logs = {
  access: { access: ["uid", "ip", "os", "browser", "path", "result", "time"] },
  block: {
    block: ["uid", "action", "reason", "actor", "handler", "time"],
    sanction: ["uid", "action", "reason", "actor", "handler", "time", "until"]
  },
  notify: { notify: ["uid", "title", "body", "image", "url", "time"] },
  tts: { tts: ["uid", "text", "voice", "type", "time"] },
  stt: { stt: ["uid", "lang", "text", "pitch", "type", "time"] }
};

const evidence = {
  record: ["id", "subject", "kind", "reason", "time", "expires"],
  member: ["uid", "subject"]
};

const invalid = () => {
  throw Object.assign(new Error("Invalid database source"), { status: 400 });
};

const location = ({ source, kind, date }) => {
  if (source === "evidence") return { file: path.data("evidence.db"), tables: evidence };

  if (source !== "log" || !Object.hasOwn(logs, kind) || !/^\d{8}$/.test(date)) invalid();

  return { file: path.log(kind, `${date}.db`), tables: logs[kind] };
};

export async function catalogue(tables, options) {
  const { source, kind, date } = options;

  if (!source) {
    return ["service", "log", "evidence"].map((source) => ({
      key: `admin.${source}`,
      scope: { source }
    }));
  }

  if (source === "service") return Object.keys(tables).map((table) => ({ table }));

  if (source === "log" && !kind) {
    return Object.keys(logs).map((kind) => ({ name: kind, scope: { source, kind } }));
  }

  if (source === "log" && !date) {
    if (!Object.hasOwn(logs, kind)) invalid();
    const files = await fs.readdir(path.log(kind), { withFileTypes: true }).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });

    return files
      .filter((file) => file.isFile() && /^\d{8}\.db$/.test(file.name))
      .map((file) => file.name.slice(0, 8))
      .sort()
      .reverse()
      .map((date) => ({ name: date, scope: { source, kind, date } }));
  }
  return Object.keys(location(options).tables).map((table) => ({ table }));
}

export async function read(table, options, run) {
  const target = location(options);

  if (!Object.hasOwn(target.tables, table)) invalid();
  const stat = await fs.lstat(target.file).catch((error) => {
    if (error.code === "ENOENT") throw Object.assign(error, { status: 404 });
    throw error;
  });

  if (!stat.isFile() || stat.isSymbolicLink()) invalid();
  const connection = await new Promise((resolve, reject) => {
    const db = new sqlite3.Database(target.file, sqlite3.OPEN_READONLY, (error) =>
      error ? reject(error) : resolve(db)
    );
  });

  connection.configure("busyTimeout", 5000);

  const query =
    (method) =>
    (sql, values = []) =>
      new Promise((resolve, reject) => {
        connection[method](sql, values, (error, result) =>
          error ? reject(error) : resolve(result)
        );
      });

  try {
    return await run({ get: query("get"), all: query("all") }, target.tables[table]);
  } finally {
    await new Promise((resolve, reject) => {
      connection.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
