import { randomUUID } from "node:crypto";
import * as db from "../db/index.js";
import * as ids from "#config/uid";
import * as media from "../config/media.js";
import * as role from "../shared/role.js";
import * as rules from "../shared/chatting.js";
import * as events from "./events.js";
import { filters } from "../shared/history.js";
import { read } from "./chatting/attachment.js";
import * as mentions from "../shared/mention.js";
import * as push from "./push.js";
import * as settings from "#shared/settings";
import { locale } from "#service/locale";

const fail = (status) => {
  throw Object.assign(new Error("Chatting request rejected"), { status });
};

export const viewer = async (uid, ip, development = false) => {
  const user = await db.get(
    `SELECT uid, role, google IS NOT NULL AS verified,
      (SELECT muted FROM sanction WHERE uid = user.uid) AS muted,
      (SELECT notice FROM sanction WHERE uid = user.uid) AS notice
      FROM user WHERE uid = ?
      AND deletion IS NULL AND erased = 0
      AND NOT EXISTS (SELECT 1 FROM block WHERE uid = user.uid OR ip = ?)
      AND NOT EXISTS (SELECT 1 FROM sanction WHERE uid = user.uid
        AND kicked > datetime('now', '+9 hours'))`,
    [uid, ip]
  );

  if (!user) fail(403);

  if (process.env.MAINTENANCE === "true" && !development && !role.staff(user.role)) fail(503);

  return user;
};

const blocked = `EXISTS (
  SELECT 1 FROM block WHERE block.uid = user.uid OR block.ip = user.ip
)`;

const select = `SELECT chatting.*, user.id AS public, user.name, user.avatar,
  user.google,
  user.role AS author_role, ${blocked} AS blocked
  FROM chatting LEFT JOIN user ON user.uid = chatting.uid`;

export const visible = (user) => {
  const deleted = user.role === role.root ? "1" : "chatting.deleted IS NULL";

  const access = role.staff(user.role)
    ? "(chatting.system IS NOT NULL OR user.uid IS NOT NULL)"
    : `((chatting.system IS NULL
        AND user.uid IS NOT NULL
        AND NOT ${blocked})
      OR json_extract(
        chatting.system,
        '$.action'
      ) IN ('mute','kick','block'))`;

  return `(${access}) AND (${deleted})`;
};

const removable = (viewer, target) =>
  viewer.uid === target.uid || viewer.role === role.root || role.manages(viewer, target);

const message = (row, user) => {
  if (row.system) {
    const { action, count } = JSON.parse(row.system);

    return {
      seq: row.seq,
      url: row.id,
      id: "",
      own: false,
      system: action,
      text: rules.notices[action].text,
      name: row.text,
      ...(count !== undefined && { count }),
      time: row.time
    };
  }

  return {
    seq: row.seq,
    url: row.id,
    id: row.public || ids.publicId(row.uid),
    name: row.google ? row.name || "" : "",
    avatar: media.resolve(row.avatar),
    ...(row.audio && { audio: media.resolve(row.audio) }),
    text: row.text,
    mentioned: row.uid !== user.uid && mentions.ids(row.text).includes(ids.publicId(user.uid)),
    ...(row.attachments && { attachments: read(row.attachments) }),
    ...(row.image && {
      image: media.resolve(row.image),
      preview: media.resolve(row.preview || row.image)
    }),
    time: row.time,
    own: row.uid === user.uid,
    removable: !row.deleted && removable(user, { uid: row.uid, role: row.author_role }),
    ...(user.role === role.root &&
      row.deleted && { deleted: true, deletedAt: row.deleted, restorable: true }),
    ...(role.staff(user.role) && { blocked: Boolean(row.blocked) })
  };
};

// 제재와 같은 트랜잭션에서 한 번만 저장합니다. 입장 안내는 대상이 아닙니다.
export const system = async (write, user, action, count, time) => {
  if (!Object.hasOwn(rules.notices, action)) fail(400);
  const id = randomUUID();
  const text = user.name || "";
  const data = JSON.stringify({ action, ...(action === "mute" && { count }) });
  const result = await write(
    "INSERT INTO chatting (id, uid, text, system, time) VALUES (?, ?, ?, ?, ?)",
    [id, user.uid, text, data, time]
  );

  return message({ seq: result.id, id, text, system: data, time });
};

const integer = (value) => {
  if (!["string", "number"].includes(typeof value)) fail(400);

  if (!/^(0|[1-9]\d*)$/.test(String(value))) fail(400);
  const number = Number(value);

  if (!Number.isSafeInteger(number)) fail(400);

  return number;
};

export const restriction = (user) => {
  const notice = user.notice ? JSON.parse(user.notice) : null;

  return {
    until: user.muted || null,
    ...(notice && {
      handler: ids.publicName(notice.handler),
      reason: notice.reason || "",
      seconds: notice.seconds
    })
  };
};

export const list = async (user, query = {}, uid) => {
  const { search } = filters(query);
  const count = query.limit === undefined ? rules.size : integer(query.limit);

  if (!count || (query.before !== undefined && query.after !== undefined)) fail(400);
  const limit = Math.min(count, rules.maximum);
  const high = (await db.get("SELECT COALESCE(MAX(seq), 0) AS seq FROM chatting")).seq;
  const conditions = [visible(user), "chatting.seq <= ?"];
  const params = [high];
  const forward = query.after !== undefined;

  if (query.live === "1" && !user.verified && !role.staff(user.role) && uid === undefined) {
    return {
      messages: [],
      muted: user.muted || null,
      restriction: restriction(user),
      history: false,
      more: false,
      cursor: high
    };
  }

  if (uid !== undefined) {
    conditions.push("chatting.uid = ? AND chatting.system IS NULL");
    params.push(uid);
  }

  if (query.before !== undefined || forward) {
    conditions.push(`chatting.seq ${forward ? ">" : "<"} ?`);
    params.push(integer(forward ? query.after : query.before));
  }

  if (query.date !== undefined) {
    const range = rules.date(query.date);

    if (!range) fail(400);

    conditions.push("chatting.time >= ? AND chatting.time < ?");
    params.push(...range);
  }

  if (search) {
    conditions.push("instr(lower(chatting.text), lower(?)) > 0");
    params.push(search);
  }

  const total =
    uid !== undefined &&
    query.before === undefined &&
    !forward &&
    (search || query.date !== undefined)
      ? (
          await db.get(
            `SELECT COUNT(*) AS total FROM chatting
              JOIN user ON user.uid = chatting.uid
              WHERE ${conditions.join(" AND ")}`,
            params
          )
        ).total
      : undefined;

  const rows = await db.all(
    `${select} WHERE ${conditions.join(" AND ")}
      ORDER BY chatting.seq ${forward ? "ASC" : "DESC"} LIMIT ?`,
    [...params, limit + 1]
  );
  const more = rows.length > limit;
  const page = rows.slice(0, limit);

  if (!forward) page.reverse();

  return {
    messages: page.map((row) => message(row, user)),
    muted: user.muted || null,
    restriction: restriction(user),
    history: Boolean(user.verified || role.staff(user.role)),
    ...(total !== undefined && { total }),
    more,
    // 누락분 복구는 실제 반환한 순서까지만 진행합니다.
    cursor: forward && more ? page.at(-1).seq : high
  };
};

export const recent = async (user, query = {}) => {
  if (user.verified || role.staff(user.role)) return list(user, query);

  const high = (await db.get("SELECT COALESCE(MAX(seq), 0) AS seq FROM chatting")).seq;

  const conditions = [
    visible(user),
    "chatting.seq <= ?",
    "chatting.time >= datetime('now', '+9 hours', '-30 minutes')"
  ];
  const params = [high];

  if (query.before !== undefined && query.after !== undefined) fail(400);
  for (const key of ["before", "after"]) {
    if (query[key] === undefined) continue;

    conditions.push(`chatting.seq ${key === "before" ? "<" : ">"} ?`);
    params.push(integer(query[key]));
  }

  const rows = await db.all(
    `${select} WHERE ${conditions.join(" AND ")}
      ORDER BY chatting.seq DESC LIMIT ?`,
    [...params, rules.maximum + 1]
  );
  const page = rows.slice(0, rules.maximum);

  return {
    messages: page.reverse().map((row) => message(row, user)),
    muted: user.muted || null,
    restriction: restriction(user),
    history: false,
    more: false,
    next: rows.length > rules.maximum ? page[0].seq : null,
    cursor: high
  };
};

export const around = async (user, id) => {
  if (!rules.validId(id)) fail(400);
  const row = await db.get(`${select} WHERE chatting.id = ? AND ${visible(user)}`, [id]);

  if (!row) fail(404);
  const before = await list(user, { before: row.seq, limit: 20 });
  const after = await list(user, { after: row.seq, limit: 20 });

  return {
    messages: [...before.messages, message(row, user), ...after.messages],
    muted: user.muted || null,
    restriction: restriction(user),
    history: Boolean(user.verified || role.staff(user.role)),
    before: before.more,
    after: after.more,
    cursor: before.cursor
  };
};

export const writable = async (user) => {
  const mute = await db.get(
    `SELECT muted, notice FROM sanction WHERE uid = ?
    AND muted > datetime('now', '+9 hours')`,
    [user.uid]
  );

  if (mute)
    throw Object.assign(new Error("Chatting muted"), {
      status: 423,
      until: mute.muted,
      restriction: restriction(mute)
    });
};

export const save = async (user, ip, text, image = null, audio = null, attachments = []) => {
  if (
    typeof text !== "string" ||
    (!text.trim() && !image && !audio && !attachments.length) ||
    text.length > rules.length
  )
    fail(400);

  await writable(user);

  const id = randomUUID();
  const result = await db.run(
    `INSERT INTO chatting (id, uid, text, image, preview, audio, attachments)
      SELECT ?, uid, ?, ?, ?, ?, ? FROM user WHERE uid = ?
        AND NOT EXISTS (SELECT 1 FROM block WHERE uid = user.uid OR ip = ?)
        AND NOT EXISTS (SELECT 1 FROM sanction WHERE uid = user.uid
          AND (muted > datetime('now', '+9 hours') OR kicked > datetime('now', '+9 hours')))`,
    [
      id,
      mentions.omit(text.trim(), user.id || ids.publicId(user.uid)),
      image?.original || null,
      image?.resizing || null,
      audio,
      attachments.length ? JSON.stringify(attachments) : null,
      user.uid,
      ip
    ]
  );

  if (!result.changes) fail(403);
  const row = await db.get(`${select} WHERE chatting.id = ?`, [id]);

  return message(row, user);
};

export const deliver = async (id, skip) => {
  await events.publish("chatting", async (client) => {
    if (client.uid === skip) return null;
    const user = await viewer(client.uid, client.ip, client.development);
    const row = await db.get(`${select} WHERE chatting.id = ? AND ${visible(user)}`, [id]);

    return row ? message(row, user) : null;
  });

  // 저장 성공과 알림 성공은 별개입니다.
  await Promise.allSettled([notify(id)]);
};

export const suggest = async (query = "", lang = "ko", uid) => {
  if (typeof query !== "string" || query.length > 80) fail(400);
  const anonymous = (locale(lang) || locale("ko"))?.["profile.anonymous"] || "{id}";

  const rows = await db.all(
    `SELECT uid, id, CASE WHEN google IS NOT NULL THEN name END AS name,
      avatar, google FROM user WHERE id IS NOT NULL
      AND NOT ${blocked}
      AND NOT EXISTS (SELECT 1 FROM sanction WHERE uid = user.uid
        AND kicked > datetime('now', '+9 hours'))
      ORDER BY name`
  );

  return {
    items: mentions
      .rank(
        rows
          .filter((user) => user.uid !== uid && events.state(user.uid) !== "offline")
          .map((user) => ({
            ...user,
            label: user.name || anonymous.replace("{id}", user.id.slice(0, 8)),
            value: user.id
          })),
        query
      )
      .map(({ uid, id, name, avatar, google }) => ({
        id,
        name: name || "",
        verified: Boolean(google),
        avatar: media.resolve(avatar),
        state: events.state(uid)
      }))
  };
};

async function notify(id) {
  if (!push.enabled) return;
  const row = await db.get(`${select} WHERE chatting.id = ?`, [id]);

  if (!row || row.deleted || row.system || row.blocked) return;
  const ids = mentions.ids(row.text);

  const recipients = await db.all(
    `SELECT uid, id, ip, lang, settings FROM user WHERE
      (id IN (${ids.length ? ids.map(() => "?").join(",") : "NULL"})
        OR json_extract(settings, '$.chat') = 1)
      AND uid <> ? AND NOT ${blocked}
      AND NOT EXISTS (SELECT 1 FROM sanction WHERE uid = user.uid
        AND kicked > datetime('now', '+9 hours'))`,
    [...ids, row.uid]
  );

  await Promise.allSettled(
    recipients.map(async (user) => {
      if (!settings.allows(settings.read(user.settings), ids.includes(user.id), true)) return;

      if (events.viewing(user.uid)) return;

      await viewer(user.uid, user.ip);

      const rows = await db.all(
        "SELECT endpoint, data FROM web WHERE uid = ? AND active = 1 AND connected = 1",
        [user.uid]
      );

      const anonymous = (locale(user.lang) || locale("ko"))?.["profile.anonymous"] || "{id}";

      await push.send(rows, {
        title:
          row.google && row.name ? row.name : anonymous.replace("{id}", row.public.slice(0, 8)),
        body: mentions.plain(row.text).slice(0, 180),
        url: `/?message=${id}`,
        tag: `mention:${id}`
      });
    })
  );
}

const removed = (id) =>
  events.publish("chatting-remove", async (client) => {
    const user = await viewer(client.uid, client.ip, client.development);

    if (user.role !== role.root) {
      return { id };
    }

    const row = await db.get(`${select} WHERE chatting.id = ?`, [id]);

    return row ? { id, message: message(row, user) } : { id };
  });

export const restore = async (user, id) => {
  if (!rules.validId(id)) fail(400);

  if (user.role !== role.root) fail(403);
  const row = await db.transaction(async () => {
    const target = await db.get("SELECT deleted FROM chatting WHERE id = ? AND system IS NULL", [
      id
    ]);

    if (!target) fail(404);

    if (!target.deleted) fail(409);
    const result = await db.run(
      `UPDATE chatting SET deleted = NULL, deleted_by = NULL
       WHERE id = ? AND deleted IS NOT NULL AND system IS NULL
       AND EXISTS (SELECT 1 FROM user WHERE uid = ? AND role = ?
         AND deletion IS NULL AND erased = 0)`,
      [id, user.uid, role.root]
    );

    if (!result.changes) fail(403);

    return db.get(`${select} WHERE chatting.id = ?`, [id]);
  });

  await events.publish("chatting-restore", async (client) => {
    const recipient = await viewer(client.uid, client.ip, client.development);
    const current = await db.get(`${select} WHERE chatting.id = ? AND ${visible(recipient)}`, [id]);

    return current ? message(current, recipient) : null;
  });

  return message(row, user);
};

export const remove = async (viewer, id) => {
  if (!rules.validId(id)) {
    fail(400);
  }

  const target = await db.get(
    `SELECT chatting.uid, chatting.deleted, user.role
      FROM chatting
      LEFT JOIN user ON user.uid = chatting.uid
      WHERE chatting.id = ?
        AND chatting.system IS NULL`,
    [id]
  );

  if (!target) {
    fail(404);
  }

  if (!removable(viewer, target)) {
    fail(403);
  }

  if (!target.deleted) {
    await db.run(
      `UPDATE chatting
        SET deleted = datetime('now', '+9 hours'),
            deleted_by = ?
        WHERE id = ? AND deleted IS NULL`,
      [viewer.uid, id]
    );
  }

  await removed(id);

  return { id };
};
