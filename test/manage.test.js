import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const time = "2026-09-08 12:34:56";

// 실제 서비스 DB 대신 테스트마다 만든 임시 폴더만 사용합니다.
const verify = async (context, code) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jjing-manage-"));

  context.after(async () => {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("jjing-manage-"));
    await rm(directory, { recursive: true, force: true });
  });

  const paths = `
    import path from "node:path";
    export { mkdir } from "node:fs/promises";
    export const data = (...parts) => path.join(${JSON.stringify(directory)}, ...parts);
    export const log = (...parts) => data("log", ...parts);
  `;

  const modules = {
    "#config/path": `data:text/javascript,${encodeURIComponent(paths)}`,
    "#service/log": `data:text/javascript,${encodeURIComponent(`export const now = () => ${JSON.stringify(time)};`)}`
  };

  const script = `
    import assert from "node:assert/strict";
    import { mkdir, readdir } from "node:fs/promises";
    import path from "node:path";
    import { registerHooks } from "node:module";
    import connect from "#db/connect";
    import schema from "#db/schema";
    import { schema as auditSchema } from "#service/log/block";

    const modules = ${JSON.stringify(modules)};
    const hooks = registerHooks({
      resolve(specifier, context, next) {
        if (modules[specifier]) return { url: modules[specifier], shortCircuit: true };
        return next(specifier, context);
      }
    });
    const { default: manage } = await import("#service/manage");
    hooks.deregister();

    const directory = ${JSON.stringify(directory)};
    const time = ${JSON.stringify(time)};
    const database = connect(path.join(directory, "service.db"));
    const { get, run, all, exec } = database;
    const close = (db) => new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
    const auditFile = path.join(directory, "log", "block", "20260908.db");
    const audit = async () => {
      const source = connect(auditFile);
      try { return await source.all("SELECT * FROM block ORDER BY rowid"); }
      finally { await close(source.db); }
    };
    const prepareAudit = async () => {
      await mkdir(path.dirname(auditFile), { recursive: true });
      await run("ATTACH DATABASE ? AS audit", [auditFile]);
      await exec(auditSchema);
    };

    try {
      await exec("PRAGMA journal_mode = WAL;" + schema);
      for (const [uid, role] of [["root", -2], ["admin", -1], ["user", 0], ["other", 0]]) {
        await run("INSERT INTO user (uid, name, role, ip) VALUES (?, ?, ?, ?)", [uid, uid + "-name", role, "ip-" + uid]);
      }
      ${code}
      console.log(JSON.stringify(true));
    } finally {
      await close(database.db);
    }
  `;

  const { stdout } = await exec(
    process.execPath,
    ["--input-type=module", "-e", script],
    { cwd: root, timeout: 15000 }
  );

  assert.equal(JSON.parse(stdout), true);
};

test("관리자가 사용자를 차단·해제하면 사유와 처리자를 일별 로그에 남긴다", async (context) => {
  await verify(
    context,
    `
    assert.deepEqual(await manage("admin", "user", "block", { reason: " block reason " }), { role: 0 });
    assert.deepEqual(await get("SELECT uid, ip, reason, actor, handler, time FROM block"), {
      uid: "user", ip: "ip-user", reason: "block reason", actor: "admin", handler: "admin-name", time
    });
    assert.deepEqual(await manage("admin", "user", "unblock", { reason: " unblock reason " }), { role: 0 });
    assert.equal(await get("SELECT 1 FROM block"), undefined);
    const records = await audit();
    assert.equal(records.length, 2);
    assert.deepEqual(records.map(({ action, reason }) => ({ action, reason })), [
      { action: "block", reason: "block reason" },
      { action: "unblock", reason: "unblock reason" }
    ]);
    assert.ok(records.every(row => row.uid === "user" && row.actor === "admin" && row.handler === "admin-name" && row.time === time));
  `
  );
});

test("총 관리자의 관리자 차단은 권한을 회수하고 해제해도 복구하지 않는다", async (context) => {
  await verify(
    context,
    `
    await run("INSERT INTO authority (uid, memo, time) VALUES ('admin', 'keep memo', '2026-01-01 00:00:00')");
    assert.deepEqual(await manage("root", "admin", "block", { reason: "reason" }), { role: 0 });
    assert.deepEqual(await get("SELECT * FROM authority WHERE uid = 'admin'"), {
      uid: "admin", memo: "keep memo", time: "2026-01-01 00:00:00", actor: "root", handler: "root-name"
    });
    assert.deepEqual(await manage("root", "admin", "unblock", { reason: "undo" }), { role: 0 });
    assert.equal((await audit()).length, 2);
  `
  );
});

test("잘못된 사유·권한·대상은 거부하며 기존 정보를 변경하지 않는다", async (context) => {
  await verify(
    context,
    `
    for (const reason of [undefined, "", "   ", 123, "x".repeat(501)]) {
      await assert.rejects(manage("admin", "user", "block", { reason }), { status: 400 });
      await assert.rejects(manage("admin", "user", "unblock", { reason }), { status: 400 });
    }
    for (const [actor, target, status] of [
      ["missing", "user", 403], ["user", "other", 403], ["root", "missing", 404],
      ["root", "root", 403], ["admin", "admin", 403], ["admin", "root", 403]
    ]) {
      await assert.rejects(manage(actor, target, "block", { reason: "reason" }), { status });
    }
    await assert.rejects(manage("root", "user", "unknown"), { status: 400 });
    await run("INSERT INTO block (uid) VALUES ('admin')");
    await assert.rejects(manage("admin", "user", "block", { reason: "reason" }), { status: 403 });
    assert.deepEqual(await all("SELECT uid FROM block"), [{ uid: "admin" }]);
    assert.equal((await get("SELECT role FROM user WHERE uid = 'admin'")).role, -1);
  `
  );
});

test("권한 부여·메모·회수는 최초 부여 시각과 기존 메모 보존 규칙을 유지한다", async (context) => {
  await verify(
    context,
    `
    assert.deepEqual(await manage("root", "user", "authority", { enabled: true, memo: "memo" }), { role: -1 });
    assert.deepEqual(await get("SELECT * FROM authority WHERE uid = 'user'"), {
      uid: "user", memo: "memo", time, actor: "root", handler: "root-name"
    });
    await run("UPDATE authority SET time = '2026-01-01 00:00:00' WHERE uid = 'user'");
    await manage("root", "user", "authority", { enabled: true });
    await manage("root", "user", "authority", { memo: "changed" });
    assert.equal((await get("SELECT time FROM authority WHERE uid = 'user'")).time, "2026-01-01 00:00:00");
    assert.deepEqual(await manage("root", "user", "authority", { enabled: false }), { role: 0 });
    assert.deepEqual(await get("SELECT memo, time FROM authority WHERE uid = 'user'"), { memo: "changed", time: "2026-01-01 00:00:00" });
    assert.equal((await readdir(directory)).includes("log"), false);
  `
  );
});

test("관리자 권한 변경은 총 관리자만 가능하며 UID·IP 차단 대상은 거부한다", async (context) => {
  await verify(
    context,
    `
    await assert.rejects(manage("admin", "user", "authority", { enabled: true }), { status: 403 });
    for (const values of [["user", null], [null, "ip-user"]]) {
      await run("DELETE FROM block");
      await run("INSERT INTO block (uid, ip) VALUES (?, ?)", values);
      await assert.rejects(manage("root", "user", "authority", { enabled: true }), { status: 409 });
    }
    assert.equal((await get("SELECT role FROM user WHERE uid = 'user'")).role, 0);
    assert.equal(await get("SELECT 1 FROM authority"), undefined);
  `
  );
});

test("공유 IP에서 다른 사용자의 차단을 해제하지 않는다", async (context) => {
  await verify(
    context,
    `
    await run("UPDATE user SET ip = 'shared' WHERE uid IN ('user', 'other')");
    await run("INSERT INTO block (uid, ip, time) VALUES ('other', 'shared', '2026-01-01')");
    await assert.rejects(manage("root", "user", "block", { reason: "reason" }), { status: 409 });
    await assert.rejects(manage("root", "user", "unblock", { reason: "reason" }), { status: 409 });
    await run("INSERT INTO block (uid, ip, time) VALUES ('user', 'shared', '2026-02-01')");
    await assert.rejects(manage("root", "user", "unblock", { reason: "reason" }), { status: 409 });
    assert.equal((await all("SELECT * FROM block")).length, 2);
  `
  );
});

test("UID 없는 IP 차단 해제와 차단되지 않은 사용자 해제의 기존 동작을 유지한다", async (context) => {
  await verify(
    context,
    `
    await run("INSERT INTO block (ip) VALUES ('ip-user')");
    await manage("admin", "user", "unblock", { reason: "ip reason" });
    assert.equal(await get("SELECT 1 FROM block"), undefined);
    await manage("admin", "user", "unblock", { reason: "no block" });
    const records = await audit();
    assert.equal(records.length, 1);
    assert.equal(records[0].reason, "ip reason");
  `
  );
});

test("차단 로그 기록 실패는 차단 등록과 관리자 권한 회수를 롤백한다", async (context) => {
  await verify(
    context,
    `
    await prepareAudit();
    await exec("CREATE TRIGGER audit.fail BEFORE INSERT ON block BEGIN SELECT RAISE(ABORT, 'audit failed'); END;");
    await assert.rejects(manage("root", "admin", "block", { reason: "reason" }), /audit failed/);
    assert.equal(await get("SELECT 1 FROM block"), undefined);
    assert.equal((await get("SELECT role FROM user WHERE uid = 'admin'")).role, -1);
    assert.equal(await get("SELECT 1 FROM authority"), undefined);
    assert.deepEqual(await audit(), []);
    await exec("DROP TRIGGER audit.fail;");
    await manage("root", "admin", "block", { reason: "retry" });
    assert.equal((await audit()).length, 1);
  `
  );
});

test("차단 해제 삭제 실패는 이미 기록한 해제 로그도 롤백한다", async (context) => {
  await verify(
    context,
    `
    await manage("root", "user", "block", { reason: "reason" });
    await exec("CREATE TRIGGER fail BEFORE DELETE ON block BEGIN SELECT RAISE(ABORT, 'delete failed'); END;");
    await assert.rejects(manage("root", "user", "unblock", { reason: "undo" }), /delete failed/);
    assert.ok(await get("SELECT 1 FROM block WHERE uid = 'user'"));
    assert.equal((await audit()).length, 1);
    await exec("DROP TRIGGER fail;");
    await manage("root", "user", "unblock", { reason: "retry" });
    assert.equal((await audit()).length, 2);
  `
  );
});

test("권한 정보 저장 실패는 먼저 변경한 사용자 역할을 롤백한다", async (context) => {
  await verify(
    context,
    `
    await exec("CREATE TRIGGER fail BEFORE INSERT ON authority BEGIN SELECT RAISE(ABORT, 'authority failed'); END;");
    await assert.rejects(manage("root", "user", "authority", { enabled: true }), /authority failed/);
    assert.equal((await get("SELECT role FROM user WHERE uid = 'user'")).role, 0);
    assert.equal(await get("SELECT 1 FROM authority"), undefined);
    await exec("DROP TRIGGER fail;");
    await manage("root", "user", "authority", { enabled: true });
    assert.equal((await get("SELECT role FROM user WHERE uid = 'user'")).role, -1);
  `
  );
});

test("동시 차단 요청은 독립 연결에서 직렬 처리하여 한 건만 기록한다", async (context) => {
  await verify(
    context,
    `
    const results = await Promise.allSettled([
      manage("root", "user", "block", { reason: "first" }),
      manage("admin", "user", "block", { reason: "second" })
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.find(result => result.status === "rejected").reason.status, 409);
    assert.equal((await all("SELECT * FROM block")).length, 1);
    assert.equal((await audit()).length, 1);
  `
  );
});
