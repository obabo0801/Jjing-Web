import { randomUUID } from "node:crypto";
import { get, all, run } from "#db";
import * as media from "#config/media";
import * as role from "#shared/role";
import * as rules from "#shared/report";
import { validId } from "#shared/chatting";
import { filters } from "#shared/history";
import { read } from "#service/chatting/attachment";

const fail = (status) => {
  throw Object.assign(new Error("Report request rejected"), { status });
};

const visible = `NOT EXISTS (
  SELECT 1 FROM block WHERE block.uid = target.uid OR block.ip = target.ip
)`;

export const save = async (user, ip, data = {}) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail(400);
  const { type, target, reason, detail = "" } = data;

  if (
    !["user", "message"].includes(type) ||
    typeof target !== "string" ||
    !target ||
    target.length > 100 ||
    !rules.reasons.includes(reason) ||
    typeof detail !== "string" ||
    detail.length > rules.length ||
    (type === "message" && !validId(target))
  )
    fail(400);

  const message = type === "message";
  const from = message
    ? "chatting JOIN user AS target ON target.uid = chatting.uid"
    : "user AS target";

  const condition = message
    ? "chatting.id = ? AND chatting.system IS NULL"
    : "target.id = ?";

  const row = await get(
    `SELECT target.uid FROM ${from} WHERE ${condition}
      AND (? OR ${visible})`,
    [target, Number(!message || role.staff(user.role))]
  );

  if (!row) fail(404);
  if (row.uid === user.uid) fail(403);
  const id = randomUUID();
  // 작성자 · 본문은 DB에서 선택하며 접수 직전 사용자 상태도 재검사합니다.
  const result = await run(
    `INSERT INTO report (id,type,reporter,target,message,text,reason,detail)
      SELECT ?, ?, actor.uid, target.uid,
        ${message ? "chatting.id, chatting.text" : "NULL, NULL"}, ?, ?
      FROM ${from} JOIN user AS actor ON actor.uid = ?
      WHERE ${condition} AND actor.uid <> target.uid AND actor.setup = 1
        AND NOT EXISTS (SELECT 1 FROM block WHERE uid = actor.uid OR ip = ?)
        AND NOT EXISTS (SELECT 1 FROM sanction WHERE uid = actor.uid
          AND kicked > datetime('now', '+9 hours'))
        AND (${message ? "actor.role IN (-2,-1)" : "1"} OR ${visible})`,
    [id, type, reason, detail.trim(), user.uid, target, ip]
  );

  if (!result.changes) fail(403);
  return { id };
};

export const list = async (user, query = {}, uid = null) => {
  if (!role.staff(user.role)) fail(403);
  const { search, range } = filters(query);
  const { before, type } = query;
  const count = query.limit ?? "50";

  if (
    (type !== undefined && !["user", "message"].includes(type)) ||
    typeof count !== "string" ||
    !/^[1-9]\d*$/.test(count) ||
    !Number.isSafeInteger(+count) ||
    (before !== undefined &&
      (typeof before !== "string" ||
        !/^[1-9]\d*$/.test(before) ||
        !Number.isSafeInteger(+before)))
  )
    fail(400);
  const limit = Math.min(+count, 100);
  const selection = `FROM report
      JOIN user AS target ON target.uid = report.target
      LEFT JOIN user AS author ON author.uid = report.reporter
      LEFT JOIN chatting ON chatting.id = report.message
      WHERE (? IS NULL OR report.type = ?)
        AND (? IS NULL OR report.target = ?)
        AND (? = '' OR instr(lower(COALESCE(report.text,'') || ' ' ||
          report.detail || ' ' || COALESCE(target.name,'') || ' ' ||
          COALESCE(author.name,'')), lower(?)) > 0)
        AND (? IS NULL OR (report.time >= ? AND report.time < ?))
        AND target.uid <> ? AND
        (target.role = 0 OR (? = -2 AND target.role = -1))`;

  const params = [
    type ?? null,
    type ?? null,
    uid,
    uid,
    search,
    search,
    range?.[0] ?? null,
    range?.[0] ?? null,
    range?.[1] ?? null,
    user.uid,
    user.role
  ];

  const total =
    before === undefined && (search || range || type)
      ? (await get(`SELECT COUNT(*) AS total ${selection}`, params)).total
      : undefined;

  const rows = await all(
    `SELECT report.*, target.id AS public, target.name AS name,
      target.role AS role, author.name AS author, chatting.attachments,
      chatting.image, chatting.preview, chatting.deleted ${selection}
      AND report.seq < ? ORDER BY report.seq DESC LIMIT ?`,
    [
      ...params,
      before === undefined ? Number.MAX_SAFE_INTEGER : +before,
      limit + 1
    ]
  );
  const page = rows.slice(0, limit);

  return {
    items: page
      .filter((row) => role.manages(user, { uid: row.target, role: row.role }))
      .map((row) => ({
        id: row.id,
        type: row.type,
        target: row.public,
        name: row.name || "",
        reporter: row.author || "",
        message: row.message,
        text: row.deleted && user.role !== role.root ? "" : row.text,
        attachments:
          row.deleted && user.role !== role.root
            ? []
            : row.attachments
              ? read(row.attachments)
              : [],
        ...(row.image &&
          (!row.deleted || user.role === role.root) && {
            image: media.resolve(row.image),
            preview: media.resolve(row.preview || row.image)
          }),
        reason: row.reason,
        detail: row.detail,
        ...(row.deleted && user.role === role.root && { deleted: true }),
        time: row.time
      })),
    next: rows.length > limit ? String(page.at(-1).seq) : null,
    ...(total !== undefined && { total })
  };
};
