import * as db from "#db";
import * as media from "#config/media";
import * as push from "#service/push";
import * as firebase from "#service/fcm";

// Only explicitly approved columns may be returned to the management UI.
const tables = {
  user: ["id", "name", "role", "date", "deletion", "erased"],
  room: ["id", "name", "multiple", "closed"],
  room_member: ["room", "left", "reason", "pinned", "muted", "deputy"],
  message: ["id", "room", "text", "read", "deleted", "time"],
  message_receipt: ["message", "read"],
  message_asset: ["kind", "url", "preview", "name", "size"],
  chatting: ["id", "text", "image", "audio", "deleted", "time"],
  chatting_asset: ["kind", "url", "preview", "name", "size"],
  report: ["id", "type", "message", "text", "reason", "detail", "time"],
  sanction: ["count", "muted", "notice", "kicked", "reason", "time"],
  block: ["reason", "time"],
  authority: ["memo", "time"],
  web: ["id", "name", "device", "os", "browser", "active", "connected", "time"],
  fcm: ["device", "time"],
  profile_file: ["file"],
  user_block: ["time"],
  conversation: ["pinned", "muted", "hidden"],
  tts: ["file", "text", "time"],
  stt: ["file", "text", "time"]
};

const invalid = () => {
  throw Object.assign(new Error("Invalid management query"), { status: 400 });
};

const query = (value = "") => {
  if (typeof value !== "string" || value.length > 200) invalid();

  return value.trim();
};

const offset = (value = "0") => {
  if (!/^\d{1,7}$/.test(String(value))) invalid();

  return Number(value) * 30;
};

export const catalogue = () => Object.keys(tables);

export const list = async (table, options) => {
  if (!Object.hasOwn(tables, table)) invalid();
  const columns = tables[table];
  const search = query(options.q);
  const field = query(options.field);
  const value = query(options.value);
  const start = offset(options.page);

  if (field && !columns.includes(field)) invalid();
  const conditions = [];
  const values = [];

  if (search) {
    conditions.push(
      `(${columns
        .map((key) => `instr(lower(coalesce(CAST("${key}" AS TEXT),'')),lower(?)) > 0`)
        .join(" OR ")})`
    );
    values.push(...columns.map(() => search));
  }

  if (field) {
    conditions.push(`CAST("${field}" AS TEXT) = ?`);
    values.push(value);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const count = await db.get(`SELECT count(*) AS total FROM "${table}"${where}`, values);

  const items = await db.all(
    `SELECT ${columns.map((key) => `"${key}"`).join(",")}
    FROM "${table}"${where} ORDER BY rowid DESC LIMIT 30 OFFSET ?`,
    [...values, start]
  );

  return { columns, items, total: count.total };
};

export const users = async (options) => {
  const search = query(options.q);
  const start = offset(options.page);
  const where = `erased = 0 AND (instr(lower(coalesce(name,'')),lower(?)) > 0
    OR instr(id,?) > 0)`;

  const count = await db.get(`SELECT count(*) AS total FROM user WHERE ${where}`, [search, search]);

  const rows = await db.all(
    `SELECT id,name,avatar,google IS NOT NULL AS verified FROM user
    WHERE ${where} ORDER BY date DESC, id LIMIT 30 OFFSET ?`,
    [search, search, start]
  );

  return {
    total: count.total,
    items: rows.map((row) => ({
      id: row.id,
      name: row.verified ? row.name || "" : "",
      avatar: media.resolve(row.avatar),
      verified: Boolean(row.verified)
    }))
  };
};

export const status = async () => {
  let database = false;

  try {
    database = (await db.get("SELECT 1 AS ready")).ready === 1;
  } catch {
    /* Keep the service status available during a database failure. */
  }

  return {
    server: true,
    database,
    uptime: Math.floor(process.uptime()),
    push: push.enabled,
    fcm: firebase.enabled
  };
};
