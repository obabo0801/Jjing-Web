import { randomUUID } from "node:crypto";
import { get, all, run } from "#db";
import { publicId } from "#config/uid";
import * as media from "#config/media";
import * as role from "#shared/role";
import * as rules from "#shared/chatting";
import * as events from "#service/events";
import { filters } from "#shared/history";
import { read } from "#service/chatting/attachment";

const fail = (status) => {
  throw Object.assign(new Error("Chatting request rejected"), { status });
};

export const viewer = async (uid, ip, development = false) => {
  const user = await get(
    `SELECT uid, role,
      (SELECT muted FROM sanction WHERE uid = user.uid) AS muted,
      (SELECT notice FROM sanction WHERE uid = user.uid) AS notice
      FROM user WHERE uid = ? AND setup = 1
      AND NOT EXISTS (SELECT 1 FROM block WHERE uid = user.uid OR ip = ?)
      AND NOT EXISTS (SELECT 1 FROM sanction WHERE uid = user.uid
        AND kicked > datetime('now', '+9 hours'))`,
    [uid, ip]
  );

  if (!user) fail(403);
  if (
    process.env.MAINTENANCE === "true" &&
    !development &&
    !role.staff(user.role)
  )
    fail(503);
  return user;
};

const blocked = `EXISTS (
  SELECT 1 FROM block WHERE block.uid = user.uid OR block.ip = user.ip
)`;

const select = `SELECT chatting.*, user.id AS public, user.name, user.avatar,
  user.role AS author_role, ${blocked} AS blocked
  FROM chatting LEFT JOIN user ON user.uid = chatting.uid`;

const visible = (user) => {
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
  viewer.uid === target.uid ||
  viewer.role === role.root ||
  role.manages(viewer, target);

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
    id: row.public || publicId(row.uid),
    name: row.name || "",
    avatar: media.resolve(row.avatar),
    ...(row.audio && { audio: media.resolve(row.audio) }),
    text: row.text,
    ...(row.attachments && { attachments: read(row.attachments) }),
    ...(row.image && {
      image: media.resolve(row.image),
      preview: media.resolve(row.preview || row.image)
    }),
    time: row.time,
    own: row.uid === user.uid,
    removable:
      !row.deleted && removable(user, { uid: row.uid, role: row.author_role }),
    ...(user.role === role.root &&
      row.deleted && { deleted: true, deletedAt: row.deleted }),
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

export const restriction = (user) => ({
  until: user.muted || null,
  ...(user.notice ? JSON.parse(user.notice) : {})
});

export const list = async (user, query = {}, uid) => {
  const { search } = filters(query);
  const count = query.limit === undefined ? rules.size : integer(query.limit);

  if (!count || (query.before !== undefined && query.after !== undefined))
    fail(400);
  const limit = Math.min(count, rules.maximum);
  const high = (await get("SELECT COALESCE(MAX(seq), 0) AS seq FROM chatting"))
    .seq;
  const conditions = [visible(user), "chatting.seq <= ?"];
  const params = [high];
  const forward = query.after !== undefined;

  if (query.live === "1" && !role.staff(user.role) && uid === undefined) {
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
          await get(
            `SELECT COUNT(*) AS total FROM chatting
              JOIN user ON user.uid = chatting.uid
              WHERE ${conditions.join(" AND ")}`,
            params
          )
        ).total
      : undefined;

  const rows = await all(
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
    history: role.staff(user.role),
    ...(total !== undefined && { total }),
    more,
    // 누락분 복구는 실제 반환한 순서까지만 진행합니다.
    cursor: forward && more ? page.at(-1).seq : high
  };
};

export const around = async (user, id) => {
  if (!rules.validId(id)) fail(400);
  const row = await get(
    `${select} WHERE chatting.id = ? AND ${visible(user)}`,
    [id]
  );

  if (!row) fail(404);
  const before = await list(user, { before: row.seq, limit: 20 });
  const after = await list(user, { after: row.seq, limit: 20 });

  return {
    messages: [...before.messages, message(row, user), ...after.messages],
    muted: user.muted || null,
    restriction: restriction(user),
    history: role.staff(user.role),
    before: before.more,
    after: after.more,
    cursor: before.cursor
  };
};

export const writable = async (user) => {
  const mute = await get(
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

export const save = async (
  user,
  ip,
  text,
  image = null,
  audio = null,
  attachments = []
) => {
  if (
    typeof text !== "string" ||
    (!text.trim() && !image && !audio && !attachments.length) ||
    text.length > rules.length
  )
    fail(400);
  await writable(user);
  const id = randomUUID();
  const result = await run(
    `INSERT INTO chatting (id, uid, text, image, preview, audio, attachments)
      SELECT ?, uid, ?, ?, ?, ?, ? FROM user WHERE uid = ? AND setup = 1
        AND NOT EXISTS (SELECT 1 FROM block WHERE uid = user.uid OR ip = ?)
        AND NOT EXISTS (SELECT 1 FROM sanction WHERE uid = user.uid
          AND (muted > datetime('now', '+9 hours') OR kicked > datetime('now', '+9 hours')))`,
    [
      id,
      text.trim(),
      image?.original || null,
      image?.resizing || null,
      audio,
      attachments.length ? JSON.stringify(attachments) : null,
      user.uid,
      ip
    ]
  );

  if (!result.changes) fail(403);
  const row = await get(`${select} WHERE chatting.id = ?`, [id]);

  return message(row, user);
};

export const deliver = (id, skip) =>
  events.publish("chatting", async (client) => {
    if (client.uid === skip) return null;
    const user = await viewer(client.uid, client.ip, client.development);
    const row = await get(
      `${select} WHERE chatting.id = ? AND ${visible(user)}`,
      [id]
    );

    return row ? message(row, user) : null;
  });

const removed = (id) =>
  events.publish("chatting-remove", async (client) => {
    const user = await viewer(client.uid, client.ip, client.development);

    if (user.role !== role.root) {
      return { id };
    }

    const row = await get(`${select} WHERE chatting.id = ?`, [id]);

    return row ? { id, message: message(row, user) } : { id };
  });

export const remove = async (viewer, id) => {
  if (!rules.validId(id)) {
    fail(400);
  }

  const target = await get(
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
    await run(
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
