import connect from "#db/connect";
import * as path from "#config/path";
import * as role from "#shared/role";
import { now } from "#service/log";
import record, { schema } from "#service/log/block";

const fail = (status) => {
  throw Object.assign(new Error("Management request rejected"), { status });
};

export default async function manage(viewer, uid, action, data = {}) {
  if (action === "block" || action === "unblock") {
    if (
      typeof data.reason !== "string" ||
      !data.reason.trim() ||
      data.reason.trim().length > 500
    )
      fail(400);
    data = { ...data, reason: data.reason.trim() };
  }
  // 공용 DB 연결과 트랜잭션이 섞이지 않도록 요청별 연결을 사용합니다.
  const { db, run, get, exec } = connect(path.data("service.db"));
  const time = now();

  let transaction = false;

  try {
    if (action !== "authority") {
      await path.mkdir(path.log("block"), { recursive: true });
      await run("ATTACH DATABASE ? AS audit", [
        path.log("block", `${time.slice(0, 10).replaceAll("-", "")}.db`)
      ]);
    }
    await exec("BEGIN IMMEDIATE;");
    transaction = true;
    const actor = await get("SELECT uid, name, role FROM user WHERE uid = ?", [
      viewer
    ]);

    const user = await get(
      "SELECT uid, name, role, ip FROM user WHERE uid = ?",
      [uid]
    );

    if (!actor || !role.staff(actor.role)) fail(403);
    if (!user) fail(404);
    if (!role.manages(actor, user)) fail(403);
    if (await get("SELECT 1 FROM block WHERE uid = ?", [actor.uid])) fail(403);

    const blocked = await get(
      "SELECT rowid AS id, * FROM block WHERE uid = ? OR ip = ? ORDER BY time DESC, rowid DESC LIMIT 1",
      [user.uid, user.ip]
    );

    const revoke = async () => {
      if (user.role !== role.admin) return;
      await run("UPDATE user SET role = ? WHERE uid = ?", [role.user, uid]);
      await run(
        `INSERT INTO authority (uid, actor, handler) VALUES (?, ?, ?)
        ON CONFLICT(uid) DO UPDATE SET actor = excluded.actor, handler = excluded.handler`,
        [uid, actor.uid, actor.name || actor.uid]
      );
    };

    if (action === "authority") {
      if (actor.role !== role.root) fail(403);
      if (blocked) fail(409);
      if (data.enabled !== undefined) {
        await run("UPDATE user SET role = ? WHERE uid = ?", [
          data.enabled ? role.admin : role.user,
          uid
        ]);
      }
      if (
        data.enabled !== undefined &&
        (user.role === role.admin) !== data.enabled
      ) {
        await run(
          `INSERT INTO authority (uid, time, actor, handler) VALUES (?, ?, ?, ?)
          ON CONFLICT(uid) DO UPDATE SET time = CASE WHEN ? THEN excluded.time ELSE authority.time END,
            actor = excluded.actor, handler = excluded.handler`,
          [
            uid,
            data.enabled ? time : null,
            actor.uid,
            actor.name || actor.uid,
            data.enabled
          ]
        );
      }
      if (data.memo !== undefined) {
        await run(
          "INSERT INTO authority (uid, memo) VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET memo = excluded.memo",
          [uid, data.memo]
        );
      }
    } else {
      await exec(schema);
      if (action === "block") {
        if (blocked) fail(409);
        await run(
          "INSERT INTO block (uid, ip, reason, actor, handler, time) VALUES (?, ?, ?, ?, ?, ?)",
          [uid, user.ip, data.reason, actor.uid, actor.name || actor.uid, time]
        );
        await revoke();
        await record(run, user, actor, action, data.reason, time);
      } else if (action === "unblock") {
        if (blocked?.uid && blocked.uid !== uid) fail(409);
        if (blocked) {
          if (
            await get(
              "SELECT 1 FROM block WHERE ip = ? AND uid IS NOT NULL AND uid <> ?",
              [user.ip, uid]
            )
          )
            fail(409);
          await revoke();
          await record(run, user, actor, action, data.reason, time);
          await run(
            "DELETE FROM block WHERE uid = ? OR (uid IS NULL AND ip = ?)",
            [uid, user.ip]
          );
        }
      } else fail(400);
    }
    const current = await get("SELECT role FROM user WHERE uid = ?", [uid]);

    await exec("COMMIT;");
    transaction = false;
    return current;
  } catch (error) {
    if (transaction) await exec("ROLLBACK;");
    throw error;
  } finally {
    await new Promise((resolve) => db.close(resolve));
  }
}
