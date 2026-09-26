import { stat } from "node:fs/promises";
import * as db from "#db";
import * as path from "#config/path";
import * as media from "#config/media";
import * as attachment from "#service/chatting/attach";
import { visible } from "#service/chatting";
import metadata from "#service/metadata";
import * as rooms from "#service/room";
import { parse } from "#shared/link";
import * as role from "#shared/role";

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
  const schema = source === "message" ? "messenger" : "chatting";

  let cursor = source === "message" ? 0 : state.cursor;

  const high = (
    await db.get(`
      SELECT COALESCE(MAX(seq), 0) AS seq
      FROM ${schema}.message
    `)
  ).seq;

  while (cursor < high) {
    const rows = await db.all(
      `
        SELECT *
        FROM ${schema}.message
        WHERE seq > ?
          AND seq <= ? ${source === "message" ? "AND NOT EXISTS (SELECT 1 FROM messenger.asset a WHERE a.seq = messenger.message.seq AND a.slot = -1)" : ""}
        ORDER BY seq
        LIMIT 100
      `,
      [cursor, high]
    );

    if (!rows.length) break;
    for (const row of rows) {
      const items = attachment
        .read(row.attachments)
        .filter((item) => item.image)
        .map((item) => ({ kind: "image", url: item.image, preview: item.preview }));

      if (row.image && !items.some((item) => item.url === media.resolve(row.image)))
        items.push({
          kind: "image",
          url: media.resolve(row.image),
          preview: media.resolve(row.preview || row.image)
        });

      if (row.audio) items.push({ kind: "file", url: media.resolve(row.audio) });
      const links = new Set();

      for (const item of parse(row.text || "")) {
        if (!item.url || !/^https?:/i.test(item.url) || links.has(item.url)) continue;

        links.add(item.url);
        items.push({ kind: "link", url: item.url, name: item.text });
      }

      for (const [slot, item] of items.entries()) {
        const url = media.resolve(item.url);

        await db.run(
          `
            INSERT INTO ${schema}.asset (seq, slot, kind, url, preview, name, size)
            VALUES(?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT DO NOTHING
          `,
          [
            row.seq,
            slot,
            item.kind,
            url,
            item.preview || null,
            item.kind === "file" ? url.split("/").at(-1) : item.name || null,
            item.kind === "link" ? null : await bytes(url)
          ]
        );
      }

      if (source === "message")
        await db.run(
          `
            INSERT INTO messenger.asset (seq, slot, kind, url)
            VALUES(?, -1, 'indexed', '')
            ON CONFLICT DO NOTHING
          `,
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

  if (!["image", "file", "link"].includes(kind) || (before !== null && !/^\d+:\d+$/.test(before)))
    throw Object.assign(new Error("Invalid asset query"), { status: 400 });

  if (!indexes.has(source)) indexes.set(source, { cursor: 0 });
  const state = indexes.get(source);

  state.pending ||= index(source, state).finally(() => {
    state.pending = undefined;
  });

  await state.pending;

  const base = room
    ? `FROM messenger.asset a JOIN messenger.message entry ON entry.seq = a.seq
      LEFT JOIN account.profile ON account.profile.uid = entry.sender
      WHERE a.kind = ? AND ${user.role === role.root ? "TRUE" : "entry.deleted IS NULL"}
      AND entry.room = ?
      AND EXISTS (SELECT 1 FROM messenger.receipt x
        WHERE x.message = entry.id AND x.uid = ?)`
    : `FROM chatting.asset a JOIN chatting.message entry ON entry.seq = a.seq
      LEFT JOIN account.profile ON account.profile.uid = entry.uid
      WHERE a.kind = ? AND ${visible(user, "entry")}`;
  const params = [kind, ...(room ? [room, user.uid] : [])];

  const totals = await db.get(
    `
      SELECT COUNT(*) AS count, SUM(a.size) AS size, COUNT(*) FILTER (WHERE a.size IS NULL) AS unknown ${base}
    `,
    params
  );
  const edge = before?.split(":").map(Number);
  const rows = await db.all(
    `
      SELECT a.*, entry.time, entry.id AS token, entry.deleted AS removed,
        entry.text AS content, ${room ? "entry.sender" : "entry.uid"} AS owner,
        account.profile.role AS rank, ${
          room
            ? `NOT EXISTS (SELECT 1 FROM messenger.receipt r
        WHERE r.message = entry.id AND r.uid <> entry.sender
        AND r.read IS NOT NULL)`
            : "1"
        } AS unread,
        CASE WHEN account.profile.erased = 0 THEN account.profile.id END AS author,
        CASE WHEN account.profile.erased = 0
        AND account.profile.google IS NOT NULL THEN account.profile.name END AS label,
        CASE WHEN account.profile.erased = 0 THEN account.profile.avatar END AS avatar,
        (account.profile.erased = 0
          AND account.profile.google IS NOT NULL) AS verified ${base} ${edge ? "AND (a.seq < ? OR a.seq = ? AND a.slot < ?)" : ""}
      ORDER BY a.seq DESC, a.slot DESC
      LIMIT 25
    `,
    [...params, ...(edge ? [edge[0], edge[0], edge[1]] : [])]
  );
  const items = rows.slice(0, 24);

  return {
    count: totals.count,
    size: totals.unknown ? null : totals.size || 0,
    items: items.map((row) => {
      const {
        seq,
        slot,
        author,
        label,
        avatar,
        verified,
        token,
        removed,
        owner,
        rank,
        unread,
        content,
        ...item
      } = row;

      return {
        ...item,
        id: `${seq}:${slot}`,
        record: {
          url: room ? "" : token,
          token: room ? token : "",
          room,
          private: Boolean(room),
          kind: room ? "message" : "",
          id: author || "",
          own: owner === user.uid,
          deleted: Boolean(removed),
          retained: Boolean(removed && user.role === role.root),
          restorable: Boolean(removed && user.role === role.root),
          removable:
            !removed &&
            (room
              ? owner === user.uid && Boolean(unread)
              : owner === user.uid ||
                user.role === role.root ||
                role.manages(user, { uid: owner, role: rank })),
          unread: Boolean(unread),
          time: item.time,
          text: content || ""
        },
        sender: {
          id: author || "",
          name: label || "",
          avatar: media.resolve(avatar || ""),
          verified: Boolean(verified)
        }
      };
    }),
    next: rows.length > 24 ? `${items.at(-1).seq}:${items.at(-1).slot}` : null
  };
};

export const preview = async (user, id, room = "") => {
  if (room) await rooms.read(user, room);

  if (!/^\d+:\d+$/.test(id)) throw Object.assign(new Error("Invalid asset"), { status: 400 });
  const row = await db.get(
    room
      ? `
        SELECT a.url
        FROM messenger.asset a
        JOIN messenger.message ON messenger.message.seq = a.seq
        WHERE a.seq = ?
          AND a.slot = ?
          AND a.kind = 'link'
          AND messenger.message.deleted IS NULL
          AND messenger.message.room = ?
          AND EXISTS (SELECT 1
          FROM messenger.receipt x
          WHERE x.message = messenger.message.id
            AND x.uid = ?)
      `
      : `
        SELECT a.url
        FROM chatting.asset a
        JOIN chatting.message ON entry.seq = a.seq
        LEFT JOIN account.profile ON account.profile.uid = entry.uid
        WHERE a.seq = ?
          AND a.slot = ?
          AND a.kind = 'link'
          AND entry.deleted IS NULL
          AND ${visible(user)}
      `,
    [...id.split(":"), ...(room ? [room, user.uid] : [])]
  );

  if (!row) throw Object.assign(new Error("Missing asset"), { status: 404 });

  return metadata(row.url);
};
