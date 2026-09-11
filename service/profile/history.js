import sqlite3 from "sqlite3";
import * as path from "#config/path";
import * as chat from "#service/chatting";
import * as history from "#shared/history";

const invalid = () => {
  throw Object.assign(new Error("Invalid history query"), { status: 400 });
};

const count = (value = "50") => {
  if (
    !["string", "number"].includes(typeof value) ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  )
    invalid();
  return Math.min(Number(value), 100);
};

export const chatting = async (user, uid, query) => {
  const page = await chat.list(
    user,
    {
      limit: count(query.limit),
      before: query.cursor,
      search: query.search,
      date: query.date
    },
    uid
  );

  const items = page.messages
    .reverse()
    .map(({ url, text, time, image, audio, deleted }) => ({
      url,
      text,
      time,
      ...(image && { image }),
      ...(audio && { audio }),
      ...(deleted && { deleted: true })
    }));

  return {
    items,
    next: page.more ? String(page.messages.at(-1).seq) : null,
    ...(page.total !== undefined && { total: page.total })
  };
};

const read = (file, uid, before, limit, sanctions, filter, totals = false) =>
  new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (error) => {
      if (error) return reject(error);
      const done = (error, rows) => {
        db.close((closing) => {
          if (error || closing) reject(error || closing);
          else resolve(rows);
        });
      };

      db.configure("busyTimeout", 5000);
      const condition = `(? = '' OR instr(lower(COALESCE(reason,'')),lower(?)) > 0
        OR instr(lower(COALESCE(handler,'')),lower(?)) > 0)
        AND (? = '' OR action = ?)
        AND (? IS NULL OR (time >= ? AND time < ?))`;

      const params = [
        filter.search,
        filter.search,
        filter.search,
        filter.action,
        filter.action,
        filter.range?.[0] ?? null,
        filter.range?.[0] ?? null,
        filter.range?.[1] ?? null
      ];

      db.all(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('block','sanction')",
        (error, tables) => {
          if (error) return done(error);
          if (sanctions) {
            const parts = tables
              .filter(({ name }) => ["block", "sanction"].includes(name))
              .map(
                ({ name }) =>
                  `SELECT rowid AS seq, ${name === "block" ? 0 : 1} AS kind,
                action,time,reason,handler,${name === "block" ? "NULL AS until" : "until"}
                FROM ${name} WHERE uid = ?`
              );

            if (!parts.length) return done(null, []);
            if (totals) {
              db.all(
                `SELECT COUNT(*) AS total FROM (${parts.join(" UNION ALL ")})
                  WHERE ${condition}`,
                [...parts.map(() => uid), ...params],
                done
              );
              return;
            }
            db.all(
              `SELECT * FROM (${parts.join(" UNION ALL ")})
              WHERE (time,kind,seq) < (?,?,?)
                AND ${condition}
              ORDER BY time DESC,kind DESC,seq DESC LIMIT ?`,
              [...parts.map(() => uid), ...before, ...params, limit],
              done
            );
            return;
          }
          if (!tables.some(({ name }) => name === "block"))
            return done(null, []);
          if (totals) {
            db.all(
              `SELECT COUNT(*) AS total FROM block
                WHERE uid = ? AND ${condition}`,
              [uid, ...params],
              done
            );
            return;
          }
          db.all(
            `SELECT rowid AS seq, action, time, reason, handler FROM block
              WHERE uid = ? AND rowid < ? AND ${condition}
              ORDER BY rowid DESC LIMIT ?`,
            [uid, before, ...params, limit],
            done
          );
        }
      );
    });
  });

export const block = async (uid, query, sanctions = false) => {
  const filter = { ...history.filters(query), action: query.action ?? "" };

  if (
    typeof filter.action !== "string" ||
    (filter.action && !Object.hasOwn(history.actions, filter.action))
  )
    invalid();
  const limit = count(query.limit);
  const cursor = query.cursor;

  let position;

  if (sanctions && cursor !== undefined) {
    try {
      if (typeof cursor !== "string" || cursor.length > 200) invalid();
      position = JSON.parse(Buffer.from(cursor, "base64url").toString());
      if (
        !Array.isArray(position) ||
        position.length !== 4 ||
        !/^\d{8}$/.test(position[0]) ||
        typeof position[1] !== "string" ||
        (position[1] !== "" &&
          !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(position[1])) ||
        ![0, 1].includes(position[2]) ||
        !Number.isSafeInteger(position[3]) ||
        position[3] < 0
      )
        invalid();
    } catch {
      invalid();
    }
  }
  if (
    !sanctions &&
    cursor !== undefined &&
    (typeof cursor !== "string" || !/^\d{8}:(0|[1-9]\d*)$/.test(cursor))
  )
    invalid();
  const [day, offset] = sanctions ? position || [] : cursor?.split(":") || [];
  const before = offset === undefined ? Number.MAX_SAFE_INTEGER : +offset;

  if (!sanctions && !Number.isSafeInteger(before)) invalid();
  const totals =
    cursor === undefined &&
    Boolean(filter.search || filter.range || filter.action);
  const summary = totals ? { total: 0 } : {};

  let files;

  try {
    files = await path.readdir(path.log("block"));
  } catch (error) {
    if (error.code === "ENOENT") return { items: [], next: null, ...summary };
    throw error;
  }
  files = files
    .filter((file) => /^\d{8}\.db$/.test(file))
    .sort()
    .reverse()
    .filter((file) => !day || file.slice(0, 8) <= day);
  if (filter.range) {
    const date = query.date.replaceAll("-", "");

    files = files.filter((file) => file.slice(0, 8) === date);
  }

  // 전체 건수는 첫 필터 요청에서만 집계하며 본문은 읽지 않습니다.
  if (totals) {
    for (const file of files) {
      const rows = await read(
        path.log("block", file),
        uid,
        null,
        0,
        sanctions,
        filter,
        true
      );

      summary.total += rows[0]?.total ?? 0;
    }
  }

  const items = [];

  let next = null;

  // 드문 기록을 찾는 요청도 한 번에 모든 일별 DB를 열지는 않습니다.
  for (const file of files.slice(0, 31)) {
    const date = file.slice(0, 8);
    const rows = await read(
      path.log("block", file),
      uid,
      sanctions
        ? date === day
          ? position.slice(1)
          : ["9999-12-31 23:59:59", 1, Number.MAX_SAFE_INTEGER]
        : date === day
          ? before
          : Number.MAX_SAFE_INTEGER,
      limit - items.length + 1,
      sanctions,
      filter
    );

    for (const { seq, kind, ...row } of rows) {
      if (items.length === limit) return { items, next, ...summary };
      items.push(row);
      next = sanctions
        ? Buffer.from(JSON.stringify([date, row.time, kind, seq])).toString(
            "base64url"
          )
        : `${date}:${seq}`;
    }
    next = sanctions
      ? Buffer.from(JSON.stringify([date, "", 0, 0])).toString("base64url")
      : `${date}:0`;
  }
  return { items, next: files.length > 31 ? next : null, ...summary };
};
