import { stat } from "node:fs/promises";
import * as db from "#db";
import * as path from "#config/path";
import * as media from "#config/media";
import * as attachment from "#service/chatting/attachment";
import { visible } from "#service/chatting";
import metadata from "#service/metadata";
import * as rooms from "#service/room";

const indexes = new Map();

const bytes = async (url) => {
  const route = media.routes.find((item) => url.startsWith(`${item.prefix}/`));
  const name = url.split("/").at(-1);

  if (!route || !/^[a-f0-9-]+\.[a-z0-9]+$/i.test(name)) return null;
  try {
    return (await stat(path.upload(route.directory, name))).size;
  } catch {
    return null;
  }
};

async function index(source, state) {
  let cursor = source === "message" ? 0 : state.cursor;

  const high = (
    await db.get(`SELECT COALESCE(MAX(seq),0) AS seq FROM ${source}`)
  ).seq;

  while (cursor < high) {
    const rows = await db.all(
      `SELECT * FROM ${source} WHERE seq > ? AND seq <= ?
        ${source === "message" ? "AND NOT EXISTS (SELECT 1 FROM message_asset a WHERE a.seq = message.seq AND a.slot = -1)" : ""}
        ORDER BY seq LIMIT 100`,
      [cursor, high]
    );

    if (!rows.length) break;
    for (const row of rows) {
      const items = attachment
        .read(row.attachments)
        .filter((item) => item.image)
        .map((item) => ({
          kind: "image",
          url: item.image,
          preview: item.preview
        }));

      if (
        row.image &&
        !items.some((item) => item.url === media.resolve(row.image))
      )
        items.push({
          kind: "image",
          url: media.resolve(row.image),
          preview: media.resolve(row.preview || row.image)
        });
      if (row.audio)
        items.push({ kind: "file", url: media.resolve(row.audio) });
      for (const url of new Set(
        (row.text || "").match(/https?:\/\/[^\s<>"']+/gi) || []
      )) {
        try {
          const parsed = new URL(url.replace(/[.,!?;:)}\]]+$/, ""));

          if (!parsed.username && !parsed.password)
            items.push({ kind: "link", url: parsed.href });
        } catch {}
      }
      for (const [slot, item] of items.entries()) {
        const url = media.resolve(item.url);

        await db.run(
          `INSERT OR IGNORE INTO ${source}_asset
          (seq,slot,kind,url,preview,name,size) VALUES(?,?,?,?,?,?,?)`,
          [
            row.seq,
            slot,
            item.kind,
            url,
            item.preview || null,
            item.kind === "file" ? url.split("/").at(-1) : null,
            item.kind === "link" ? null : await bytes(url)
          ]
        );
      }
      if (source === "message")
        await db.run(
          `INSERT OR IGNORE INTO message_asset
          (seq,slot,kind,url) VALUES(?,-1,'indexed','')`,
          [row.seq]
        );
      cursor = row.seq;
      state.cursor = cursor;
    }
  }
}

export const list = async (user, query, room = "") => {
  if (room) await rooms.read(user, room);
  const source = room ? "message" : "chatting";
  const kind = query.kind || "image";
  const before = query.before === undefined ? null : query.before;

  if (
    !["image", "file", "link"].includes(kind) ||
    (before !== null && !/^\d+:\d+$/.test(before))
  )
    throw Object.assign(new Error("Invalid asset query"), { status: 400 });
  if (!indexes.has(source)) indexes.set(source, { cursor: 0 });
  const state = indexes.get(source);

  state.pending ||= index(source, state).finally(() => {
    state.pending = undefined;
  });
  await state.pending;
  const base = room
    ? `FROM message_asset a JOIN message chatting ON chatting.seq = a.seq
      WHERE a.kind = ? AND chatting.deleted IS NULL AND chatting.room = ?
      AND EXISTS (SELECT 1 FROM message_receipt x
        WHERE x.message = chatting.id AND x.uid = ?)`
    : `FROM chatting_asset a JOIN chatting ON chatting.seq = a.seq
      LEFT JOIN user ON user.uid = chatting.uid
      WHERE a.kind = ? AND chatting.deleted IS NULL AND ${visible(user)}`;
  const params = [kind, ...(room ? [room, user.uid] : [])];

  const totals = await db.get(
    `SELECT COUNT(*) AS count, SUM(a.size) AS size,
    SUM(a.size IS NULL) AS unknown ${base}`,
    params
  );
  const edge = before?.split(":").map(Number);
  const rows = await db.all(
    `SELECT a.*, chatting.time ${base}
    ${edge ? "AND (a.seq < ? OR a.seq = ? AND a.slot < ?)" : ""}
    ORDER BY a.seq DESC, a.slot DESC LIMIT 25`,
    [...params, ...(edge ? [edge[0], edge[0], edge[1]] : [])]
  );
  const items = rows.slice(0, 24);

  return {
    count: totals.count,
    size: totals.unknown ? null : totals.size || 0,
    items: items.map(({ seq, slot, ...item }) => ({
      ...item,
      id: `${seq}:${slot}`
    })),
    next: rows.length > 24 ? `${items.at(-1).seq}:${items.at(-1).slot}` : null
  };
};

export const preview = async (user, id, room = "") => {
  if (room) await rooms.read(user, room);
  if (!/^\d+:\d+$/.test(id))
    throw Object.assign(new Error("Invalid asset"), { status: 400 });
  const row = await db.get(
    room
      ? `SELECT a.url FROM message_asset a
        JOIN message ON message.seq = a.seq
        WHERE a.seq = ? AND a.slot = ? AND a.kind = 'link'
        AND message.deleted IS NULL AND message.room = ?
        AND EXISTS (SELECT 1 FROM message_receipt x
          WHERE x.message = message.id AND x.uid = ?)`
      : `SELECT a.url FROM chatting_asset a
    JOIN chatting ON chatting.seq = a.seq
    LEFT JOIN user ON user.uid = chatting.uid
    WHERE a.seq = ? AND a.slot = ? AND a.kind = 'link'
    AND chatting.deleted IS NULL AND ${visible(user)}`,
    [...id.split(":"), ...(room ? [room, user.uid] : [])]
  );

  if (!row) throw Object.assign(new Error("Missing asset"), { status: 404 });
  return metadata(row.url);
};
