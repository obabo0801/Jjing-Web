import { publicId } from "#config/uid";
import connect from "#db/connect";
import * as path from "#config/path";
import * as role from "#shared/role";
import { now } from "#service/log";
import record, { schema } from "#service/log/block";
import { system } from "#service/chatting";

const fail = (status) => {
  throw Object.assign(new Error("Management request rejected"), { status });
};

export default async function manage(viewer, uid, action, data = {}) {
  if (["block", "unblock", "mute", "kick", "unkick"].includes(action)) {
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
    if (
      await get("SELECT 1 FROM sanction WHERE uid = ? AND kicked > ?", [
        actor.uid,
        time
      ])
    )
      fail(403);

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
        [uid, actor.uid, actor.name || publicId(actor.uid)]
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
            actor.name || publicId(actor.uid),
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
      if (["mute", "kick", "unkick"].includes(action)) {
        if (blocked) fail(409);
        const current = await get("SELECT * FROM sanction WHERE uid = ?", [
          uid
        ]);

        let until = null;

        if (action === "mute") {
          if (current?.kicked > time) fail(409);
          const count = (current?.count || 0) + 1;
          const seconds = count === 1 ? 30 : count === 2 ? 60 : 120;

          until = (
            await get("SELECT datetime(?, ?) AS time", [
              current?.muted > time ? current.muted : time,
              `+${seconds} seconds`
            ])
          ).time;

          await run(
            `INSERT INTO sanction(uid,count,muted,notice) VALUES(?,?,?,?)
            ON CONFLICT(uid) DO UPDATE SET count=excluded.count,
              muted=excluded.muted, notice=excluded.notice`,
            [
              uid,
              count,
              until,
              JSON.stringify({
                handler: actor.name || "",
                reason: data.reason,
                seconds
              })
            ]
          );
        } else if (action === "kick") {
          if (current?.kicked > time) fail(409);
          until = (await get("SELECT datetime(?, '+24 hours') AS time", [time]))
            .time;

          await run(
            `INSERT INTO sanction(uid,kicked,reason,time) VALUES(?,?,?,?)
            ON CONFLICT(uid) DO UPDATE SET kicked=excluded.kicked,
              reason=excluded.reason, time=excluded.time`,
            [uid, until, data.reason, time]
          );
        } else {
          if (!current?.kicked || current.kicked <= time) fail(409);
          await run("UPDATE sanction SET kicked = NULL WHERE uid = ?", [uid]);
        }
        await run(
          `INSERT INTO audit.sanction(uid,action,reason,actor,handler,time,until)
          VALUES(?,?,?,?,?,?,?)`,
          [
            uid,
            action,
            data.reason,
            actor.uid,
            actor.name || publicId(actor.uid),
            time,
            until
          ]
        );
      } else if (action === "block") {
        if (blocked) fail(409);
        await run(
          "INSERT INTO block (uid, ip, reason, actor, handler, time) VALUES (?, ?, ?, ?, ?, ?)",
          [
            uid,
            user.ip,
            data.reason,
            actor.uid,
            actor.name || publicId(actor.uid),
            time
          ]
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

    if (["mute", "kick", "unkick"].includes(action))
      current.sanction = await get(
        "SELECT count, muted, kicked, notice FROM sanction WHERE uid = ?",
        [uid]
      );

    current.handler = actor.name || "";
    if (action === "unblock") current.released = Boolean(blocked);
    if (action !== "authority" && (action !== "unblock" || current.released))
      current.message = await system(
        run,
        user,
        action,
        current.sanction?.count,
        time
      );
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
