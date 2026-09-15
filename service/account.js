import { randomBytes } from "node:crypto";
import * as db from "#db";
import connect from "#db/connect";
import * as path from "#config/path";
import * as evidence from "#service/evidence";
import * as events from "#service/events";
import * as profile from "#service/profile";
import * as media from "#config/media";
import * as history from "#service/history";
import * as rooms from "#service/room";
import { publicId } from "#config/uid";

const week = 7 * 86400000;
const jobs = new Map();

export const request = async (uid) => {
  const user = await db.get(
    `UPDATE user SET deletion = COALESCE(deletion, ?), session = NULL,
      recovery = NULL, recovery_until = NULL
      WHERE uid = ? AND google IS NOT NULL AND erased = 0
      RETURNING id, deletion`,
    [Date.now() + week, uid]
  );

  if (!user) return null;
  profile.disconnect(uid);
  events.disconnect(uid);
  await db.run("UPDATE web SET connected = 0 WHERE uid = ?", [uid]);
  await db.run("DELETE FROM fcm WHERE uid = ?", [uid]);
  events.broadcast("online");

  return user;
};

export const challenge = async (uid) => {
  const token = randomBytes(32).toString("base64url");
  const result = await db.run(
    `UPDATE user SET recovery = ?, recovery_until = ?
      WHERE uid = ? AND deletion > ? AND erased = 0`,
    [token, Date.now() + 600000, uid, Date.now()]
  );

  return result.changes ? token : "";
};

export const pending = (token) =>
  typeof token === "string"
    ? db.get(
        `SELECT uid, deletion FROM user WHERE recovery = ?
          AND recovery_until > ? AND deletion > ? AND erased = 0`,
        [token, Date.now(), Date.now()]
      )
    : null;

export const restore = (token) =>
  typeof token === "string"
    ? db.get(
        `UPDATE user SET deletion = NULL, recovery = NULL,
          recovery_until = NULL, session = NULL
          WHERE recovery = ? AND recovery_until > ? AND deletion > ?
            AND erased = 0 RETURNING uid`,
        [token, Date.now(), Date.now()]
      )
    : null;

const logs = async (uid, collect = false) => {
  const records = [];

  for (const folder of ["access", "block", "notify", "stt", "tts"]) {
    let files;

    try {
      files = await path.readdir(path.log(folder));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }

    for (const file of files.filter((name) => /^\d{8}\.db$/.test(name))) {
      const log = connect(path.log(folder, file));

      try {
        const tables = await log.all("SELECT name FROM sqlite_master WHERE type = 'table'");

        for (const { name } of tables) {
          if (!["access", "block", "sanction", "notify", "stt", "tts"].includes(name)) continue;
          if (collect) {
            if (!["block", "sanction"].includes(name)) continue;
            const rows = await log.all(
              `SELECT rowid, action, reason, time FROM ${name} WHERE uid = ?`,
              [uid]
            );

            records.push(
              ...rows.map((row) => ({
                source: `${folder}/${file}/${name}/${row.rowid}`,
                kind: row.action,
                reason: row.reason,
                time: row.time
              }))
            );
          } else {
            await log.exec("PRAGMA secure_delete = ON");
            await log.run(`DELETE FROM ${name} WHERE uid = ?`, [uid]);
            if (["block", "sanction"].includes(name))
              await log.run(`UPDATE ${name} SET actor = '', handler = '' WHERE actor = ?`, [uid]);
            const columns = await log.all(`PRAGMA table_info(${name})`);

            if (columns.some((column) => column.name === "snapshot")) {
              const id = publicId(uid);
              const rows = await log.all(
                `SELECT rowid, snapshot FROM ${name} WHERE instr(snapshot, ?)`,
                [id]
              );

              for (const row of rows)
                await log.run(`UPDATE ${name} SET snapshot = ? WHERE rowid = ?`, [
                  history.redact(row.snapshot, id),
                  row.rowid
                ]);
            }
          }
        }
      } finally {
        await new Promise((resolve, reject) =>
          log.db.close((error) => (error ? reject(error) : resolve()))
        );
      }
    }
  }

  return records;
};

const erase = async (uid) => {
  const user = await db.get("SELECT * FROM user WHERE uid = ? AND deletion <= ? AND erased = 0", [
    uid,
    Date.now()
  ]);

  if (!user) return;
  events.disconnect(uid);

  const records = await logs(uid, true);
  const reports = await db.all("SELECT id, reason, time FROM report WHERE target = ?", [uid]);

  // A report is an allegation, not a confirmed sanction. Keep no message copy.
  records.push(
    ...reports.map((row) => ({
      source: `report/${row.id}`,
      kind: "report",
      reason: row.reason,
      time: row.time
    }))
  );

  const blocks = await db.all("SELECT rowid, reason, time FROM block WHERE uid = ?", [uid]);

  records.push(
    ...blocks.map((row) => ({
      source: `block/${row.rowid}`,
      kind: "block",
      reason: row.reason,
      time: row.time
    }))
  );
  await evidence.save(user, records);
  await logs(uid);
  await evidence.forget(uid);

  const files = await db.all("SELECT file FROM profile_file WHERE uid = ?", [uid]);
  const draft = JSON.parse(user.draft || "null");

  for (const file of new Set([
    ...files.map((item) => item.file),
    user.image,
    user.avatar,
    draft?.image,
    draft?.avatar
  ])) {
    const url = media.resolve(file);
    const route = media.routes.find(
      (item) => item.directory.startsWith("users/") && url.startsWith(`${item.prefix}/`)
    );

    if (!route) continue;
    const name = url.slice(route.prefix.length + 1);

    if (!/^[a-f0-9]{32}\.(?:jpg|png|gif|webp)$/.test(name)) continue;
    const shared = await db.get(
      `SELECT 1 FROM user WHERE uid <> ? AND
        (instr(COALESCE(image, ''), ?) OR instr(COALESCE(avatar, ''), ?)
          OR instr(COALESCE(draft, ''), ?))
        UNION ALL SELECT 1 FROM profile_file WHERE uid <> ? AND instr(file, ?)
        UNION ALL SELECT 1 FROM chatting WHERE
          instr(text, ?) OR instr(COALESCE(attachments, ''), ?)
          OR instr(COALESCE(image, ''), ?) OR instr(COALESCE(preview, ''), ?)
        LIMIT 1`,
      [uid, name, name, name, uid, name, name, name, name, name]
    );

    if (!shared) await path.rm(path.upload(route.directory, name), { force: true });
  }

  await db.run("DELETE FROM profile_file WHERE uid = ?", [uid]);
  for (const folder of ["stt", "tts"]) {
    const cached = await db.all(`SELECT file FROM ${folder} WHERE uid = ?`, [uid]);

    for (const { file } of cached) {
      if (!/^[a-f0-9]{32}\.(?:mp3|webm|ogg|m4a)$/.test(file)) continue;
      const shared = await db.get(`SELECT 1 FROM ${folder} WHERE file = ? AND uid <> ? LIMIT 1`, [
        file,
        uid
      ]);

      if (!shared) await path.rm(path[folder](file), { force: true });
    }
  }

  for (const table of ["web", "fcm", "sanction", "block", "authority", "stt", "tts"])
    await db.run(`DELETE FROM ${table} WHERE uid = ?`, [uid]);
  await db.run("DELETE FROM report WHERE target = ? OR reporter = ?", [uid, uid]);

  await db.run("DELETE FROM conversation WHERE uid = ? OR peer = ?", [uid, uid]);
  await db.run("DELETE FROM user_block WHERE uid = ? OR peer = ?", [uid, uid]);

  const memberships = await db.all("SELECT room FROM room_member WHERE uid = ?", [uid]);

  for (const { room } of memberships) {
    await db.transaction(async () => {
      const current = await db.get("SELECT * FROM room WHERE id = ?", [room]);
      const successor = await db.get(
        `SELECT m.uid FROM room_member m JOIN user u ON u.uid = m.uid
        WHERE m.room = ? AND m.uid <> ? AND m.left IS NULL AND u.erased = 0
        AND u.deletion IS NULL ORDER BY m.uid LIMIT 1`,
        [room, uid]
      );

      if (!current) return;
      if (!current.multiple || !successor)
        await db.run(
          "UPDATE room SET closed = coalesce(closed,datetime('now','+9 hours')) WHERE id = ?",
          [room]
        );
      if (current.owner === uid) {
        await db.run("UPDATE room SET owner = ? WHERE id = ?", [successor?.uid || null, room]);
        if (successor)
          await db.run("UPDATE room_member SET deputy = 0 WHERE room = ? AND uid = ?", [
            room,
            successor.uid
          ]);
      }

      await db.run(
        `UPDATE room_member SET left = datetime('now','+9 hours'), reason = 'account',
          deputy = 0
        WHERE room = ? AND uid = ?`,
        [room, uid]
      );
    });
    await rooms.notify(room);
  }

  const condition = `sender = ? OR (recipient = ? AND room IN
    (SELECT id FROM room WHERE multiple = 0))`;

  await db.run(
    `DELETE FROM message_asset WHERE seq IN
    (SELECT seq FROM message WHERE ${condition})`,
    [uid, uid]
  );

  await db.run(
    `DELETE FROM message_receipt WHERE uid = ? OR message IN
    (SELECT id FROM message WHERE ${condition})`,
    [uid, uid, uid]
  );
  await db.run(`DELETE FROM message WHERE ${condition}`, [uid, uid]);

  const snapshots = await db.all("SELECT seq, snapshot FROM report WHERE instr(snapshot, ?)", [
    user.id
  ]);

  for (const row of snapshots)
    await db.run("UPDATE report SET snapshot = ? WHERE seq = ?", [
      history.redact(row.snapshot, user.id),
      row.seq
    ]);
  for (const table of ["block", "authority"])
    await db.run(`UPDATE ${table} SET actor = NULL, handler = NULL WHERE actor = ?`, [uid]);
  // Retain only the anonymous author reference needed by existing chat messages.
  await db.run(
    `UPDATE user SET google = NULL, email = NULL, name = NULL, avatar = NULL,
      image = NULL, draft = NULL, consent = NULL, settings = NULL, renamed = NULL,
      session = NULL, recovery = NULL, recovery_until = NULL, deletion = NULL,
      setup = 0, role = 0, ip = '', initial = NULL, lang = NULL, date = '', erased = 1
      WHERE uid = ? AND deletion <= ?`,
    [uid, Date.now()]
  );

  await db.run(
    `DELETE FROM user WHERE uid = ? AND erased = 1
      AND NOT EXISTS (SELECT 1 FROM chatting WHERE chatting.uid = user.uid)`,
    [uid]
  );
  events.broadcast("profile-update", { id: user.id });
};

export const finalize = (uid) => {
  if (!jobs.has(uid))
    jobs.set(
      uid,
      erase(uid).finally(() => jobs.delete(uid))
    );

  return jobs.get(uid);
};

let running;

export const clean = () =>
  (running ||= (async () => {
    const rows = await db.all("SELECT uid FROM user WHERE deletion <= ? AND erased = 0", [
      Date.now()
    ]);

    let failed = false;

    for (const { uid } of rows) {
      try {
        await finalize(uid);
      } catch {
        failed = true;
      }
    }

    await evidence.clean();
    await db.run(
      `UPDATE user SET recovery = NULL, recovery_until = NULL
        WHERE recovery_until <= ?`,
      [Date.now()]
    );
    if (failed) throw new Error("Account cleanup incomplete");
  })().finally(() => {
    running = undefined;
  }));

export const start = async () => {
  await clean();
  setInterval(() => {
    clean().catch(() => console.error("Account cleanup failed; retry scheduled"));
  }, 60000).unref();
};
