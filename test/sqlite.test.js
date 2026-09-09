import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");

const fixture = async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jjing-sqlite-"));

  t.after(async () => {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("jjing-sqlite-"));
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
};

const seed = (directory, sql) => {
  const db = new DatabaseSync(path.join(directory, "service.db"));

  try {
    db.exec(sql);
  } finally {
    db.close();
  }
};

// 저장 경로만 임시 폴더로 바꾸고 실제 SQLite 모듈을 실행합니다.
const start = async (directory, code = "return true;") => {
  const paths = `
    import path from "node:path";
    export { mkdirSync } from "node:fs";
    export const data = (...parts) => path.join(${JSON.stringify(directory)}, ...parts);
  `;

  const script = `
    import { registerHooks } from "node:module";
    const hooks = registerHooks({
      resolve(specifier, context, next) {
        if (specifier === "#config/path") {
          return { url: ${JSON.stringify(`data:text/javascript,${encodeURIComponent(paths)}`)}, shortCircuit: true };
        }
        return next(specifier, context);
      }
    });
    const { default: db, get, run, all } = await import("#db");
    hooks.deregister();
    try {
      const result = await (async () => { ${code} })();
      console.log(JSON.stringify(result));
    } finally {
      await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
    }
  `;

  const { stdout } = await exec(
    process.execPath,
    ["--input-type=module", "-e", script],
    { cwd: root, timeout: 10000 }
  );

  return JSON.parse(stdout);
};

const legacy = `
  CREATE TABLE user (
    uid TEXT PRIMARY KEY, name TEXT, email TEXT, image TEXT, avatar TEXT,
    role INTEGER NOT NULL DEFAULT 0 CHECK (role IN (-1, 0)),
    ip TEXT NOT NULL, date TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
  );
  INSERT INTO user (rowid, uid, name, role, ip) VALUES (42, 'old', 'Old', -1, '192.0.2.1');
  CREATE TABLE block (uid TEXT, ip TEXT, reason TEXT,
    log INTEGER NOT NULL DEFAULT 0 CHECK (log IN (0, 1)),
    time TEXT NOT NULL DEFAULT (datetime('now', '+9 hours')));
  CREATE INDEX old_email ON user(email);
  CREATE TABLE history (uid TEXT);
  CREATE TRIGGER old_update AFTER UPDATE OF name ON user
    BEGIN INSERT INTO history VALUES (NEW.uid); END;
`;

test("빈 DB에 기존 테이블·인덱스와 WAL·대기 시간을 준비한다", async (t) => {
  const directory = await fixture(t);
  const result = await start(
    directory,
    `return {
    tables: (await all("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")).map(row => row.name),
    indexes: (await all("SELECT name FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY name")).map(row => row.name),
    journal: await get('PRAGMA journal_mode'), timeout: await get('PRAGMA busy_timeout')
  };`
  );

  assert.deepEqual(result.tables, [
    "authority",
    "block",
    "draft",
    "fcm",
    "stt",
    "tts",
    "user",
    "web"
  ]);

  assert.deepEqual(result.indexes, [
    "block_ip",
    "block_uid",
    "draft_name",
    "fcm_uid",
    "stt_file",
    "stt_uid",
    "tts_file",
    "tts_uid",
    "user_ip",
    "user_name",
    "web_uid"
  ]);
  assert.deepEqual(result.journal, { journal_mode: "wal" });
  assert.deepEqual(result.timeout, { timeout: 5000 });
});

test("쿼리 도우미의 매개변수·반환값·기본값·오류 전달을 유지한다", async (t) => {
  const directory = await fixture(t);
  const result = await start(
    directory,
    `
    const inserted = await run('INSERT INTO user (uid, name, ip) VALUES (?, ?, ?)', ["u1", "O'Name", "192.0.2.2"]);
    const changed = await run('UPDATE user SET email = ? WHERE uid = ?', ["test@example.test", "u1"]);
    const user = await get('SELECT uid, name, setup, role, consent, date FROM user WHERE uid = ?', ['u1']);
    const missing = (await get('SELECT uid FROM user WHERE uid = ?', ['missing'])) === undefined;
    const failures = [];
    for (const query of [get, run, all]) {
      try { await query('SELECT * FROM missing_table'); } catch (error) { failures.push(error.code); }
    }
    return { inserted, changed, user, missing, empty: await all('SELECT uid FROM user WHERE role = -2'), failures };
  `
  );

  assert.deepEqual(result.inserted, { id: 1, changes: 1 });
  assert.deepEqual(result.changed, { id: 1, changes: 1 });
  assert.deepEqual(
    { ...result.user, date: null },
    { uid: "u1", name: "O'Name", setup: 0, role: 0, consent: null, date: null }
  );
  assert.match(result.user.date, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.equal(result.missing, true);
  assert.deepEqual(result.empty, []);
  assert.deepEqual(result.failures, [
    "SQLITE_ERROR",
    "SQLITE_ERROR",
    "SQLITE_ERROR"
  ]);
});

test("닉네임 중복·역할·동의 완료 상태의 기존 제약을 유지한다", async (t) => {
  const directory = await fixture(t);
  const result = await start(
    directory,
    `
    await run("INSERT INTO user (uid, name, ip, role) VALUES ('root', 'Root', '192.0.2.1', -2)");
    const failures = [];
    for (const sql of [
      "INSERT INTO user (uid, name, ip) VALUES ('copy', 'root', '192.0.2.2')",
      "UPDATE user SET role = 1", "UPDATE user SET setup = 2"
    ]) {
      try { await run(sql); } catch (error) { failures.push(error.code); }
    }
    return failures;
  `
  );

  assert.deepEqual(result, [
    "SQLITE_CONSTRAINT",
    "SQLITE_CONSTRAINT",
    "SQLITE_CONSTRAINT"
  ]);
});

test("이전 DB를 백업하고 누락 열·root 역할을 추가하며 rowid·인덱스·트리거를 보존한다", async (t) => {
  const directory = await fixture(t);

  seed(directory, legacy);
  const result = await start(
    directory,
    `
    await run("UPDATE user SET name = 'Renamed', role = -2 WHERE uid = 'old'");
    return { user: await get('SELECT rowid, * FROM user'),
      history: await all('SELECT * FROM history'),
      indexes: await all("SELECT name FROM sqlite_master WHERE name = 'old_email'"),
      blocks: (await all('PRAGMA table_info(block)')).map(row => row.name) };
  `
  );

  assert.equal(result.user.rowid, 42);
  assert.equal(result.user.uid, "old");
  assert.equal(result.user.role, -2);
  assert.equal(result.user.setup, 0);
  for (const name of ["initial", "lang", "consent"])
    assert.equal(result.user[name], null);
  assert.deepEqual(result.history, [{ uid: "old" }]);
  assert.deepEqual(result.indexes, [{ name: "old_email" }]);
  assert.ok(
    result.blocks.includes("actor") && result.blocks.includes("handler")
  );
  const backups = (await readdir(directory)).filter((name) =>
    /^service-role-\d+\.db$/.test(name)
  );

  assert.equal(backups.length, 1);
  const backup = new DatabaseSync(path.join(directory, backups[0]), {
    readOnly: true
  });

  try {
    assert.equal(
      backup.prepare("SELECT role FROM user WHERE uid = 'old'").get().role,
      -1
    );
    assert.throws(() => backup.exec("UPDATE user SET role = -2"), /readonly/);
    assert.match(
      backup.prepare("SELECT sql FROM sqlite_master WHERE name = 'user'").get()
        .sql,
      /role IN \(-1, 0\)/
    );
  } finally {
    backup.close();
  }
});

test("반복 시작 시 기존 값과 스키마를 유지하고 권한 백업을 중복 생성하지 않는다", async (t) => {
  const directory = await fixture(t);

  seed(directory, legacy);
  await start(
    directory,
    `
    await run("UPDATE user SET initial = 'initial-ip', lang = 'ko-KR', setup = 1, consent = 'saved', role = -2");
    return true;
  `
  );
  const snapshot = `return { user: await all('SELECT rowid, * FROM user'), schema: await all("SELECT type, name, sql FROM sqlite_master ORDER BY name") };`;
  const before = await start(directory, snapshot);

  assert.deepEqual(await start(directory, snapshot), before);
  assert.equal(before.user[0].consent, "saved");
  assert.equal(before.user[0].initial, "initial-ip");
  assert.equal(before.user[0].lang, "ko-KR");
  assert.equal(before.user[0].setup, 1);
  assert.equal(
    (await readdir(directory)).filter((name) =>
      name.startsWith("service-role-")
    ).length,
    1
  );
});

test("역할 확장 시 이미 저장된 프로필·동의·언어 값을 보존한다", async (t) => {
  const directory = await fixture(t);

  seed(
    directory,
    `${legacy}
    ALTER TABLE user ADD COLUMN initial TEXT;
    ALTER TABLE user ADD COLUMN lang TEXT;
    ALTER TABLE user ADD COLUMN setup INTEGER NOT NULL DEFAULT 0 CHECK (setup IN (0, 1));
    ALTER TABLE user ADD COLUMN consent TEXT;
    UPDATE user SET initial = 'first-ip', lang = 'en-US', setup = 1, consent = '{"terms":true}', email = 'old@example.test', image = 'image.webp', avatar = 'avatar.webp';
  `
  );
  const result = await start(
    directory,
    "return await get('SELECT rowid, * FROM user');"
  );

  assert.equal(result.rowid, 42);
  assert.equal(result.initial, "first-ip");
  assert.equal(result.lang, "en-US");
  assert.equal(result.setup, 1);
  assert.equal(result.consent, '{"terms":true}');
  assert.equal(result.email, "old@example.test");
  assert.equal(result.image, "image.webp");
  assert.equal(result.avatar, "avatar.webp");
});

test("현재 DB의 프로필·차단·초안·권한·알림·음성 데이터를 재시작 후 유지한다", async (t) => {
  const directory = await fixture(t);

  await start(directory);
  seed(
    directory,
    `
    INSERT INTO user (uid, name, ip, role) VALUES ('u1', 'User', '192.0.2.1', 0);
    INSERT INTO block (uid, ip, reason, actor, handler) VALUES ('blocked', '192.0.2.2', 'reason', 'root', 'Root');
    INSERT INTO draft (uid, name, email, image, avatar) VALUES ('draft', 'Draft', '', 'image', 'avatar');
    INSERT INTO authority (uid, memo, time, actor, handler) VALUES ('u1', 'memo', '2026-01-01', 'root', 'Root');
    INSERT INTO web (uid, endpoint, data) VALUES ('u1', 'https://example.test/push', '{}');
    INSERT INTO fcm (uid, fid, device) VALUES ('u1', 'fid', 'wearable');
    INSERT INTO tts (file, uid, text, time) VALUES ('tts', 'u1', 'text', '2026-01-01');
    INSERT INTO stt (file, uid, text, time) VALUES ('stt', 'u1', 'text', '2026-01-01');
  `
  );
  const tables = [
    "user",
    "block",
    "draft",
    "authority",
    "web",
    "fcm",
    "tts",
    "stt"
  ];

  const db = new DatabaseSync(path.join(directory, "service.db"), {
    readOnly: true
  });

  let before;

  try {
    before = JSON.parse(
      JSON.stringify(
        Object.fromEntries(
          tables.map((name) => [
            name,
            db.prepare(`SELECT rowid, * FROM ${name}`).all()
          ])
        )
      )
    );
  } finally {
    db.close();
  }
  const result = await start(
    directory,
    `
    const rows = {};
    for (const name of ${JSON.stringify(tables)}) rows[name] = await all('SELECT rowid, * FROM ' + name);
    return rows;
  `
  );

  assert.deepEqual(result, before);
  assert.deepEqual(
    (await readdir(directory)).filter((name) =>
      name.startsWith("service-role-")
    ),
    []
  );
});

test("기존 차단 UID·IP의 관리자 권한 회수와 처리자 기록을 유지한다", async (t) => {
  const directory = await fixture(t);

  await start(directory);
  seed(
    directory,
    `
    INSERT INTO user (uid, ip, role) VALUES ('blocked', '192.0.2.1', -1), ('same-ip', '192.0.2.1', -1), ('root', '192.0.2.1', -2), ('safe', '192.0.2.2', -1);
    INSERT INTO block (uid, ip, actor, handler, time) VALUES ('blocked', '192.0.2.1', 'first', 'First', '2026-01-01'), ('blocked', '192.0.2.1', 'last', 'Last', '2026-01-02');
  `
  );
  const code = `return { users: await all('SELECT uid, role FROM user ORDER BY uid'), authority: await all('SELECT uid, actor, handler FROM authority ORDER BY uid') };`;
  const result = await start(directory, code);

  assert.deepEqual(result.users, [
    { uid: "blocked", role: 0 },
    { uid: "root", role: -2 },
    { uid: "safe", role: -1 },
    { uid: "same-ip", role: 0 }
  ]);

  assert.deepEqual(result.authority, [
    { uid: "blocked", actor: "last", handler: "Last" },
    { uid: "same-ip", actor: "last", handler: "Last" }
  ]);
  assert.deepEqual(await start(directory, code), result);
});

test("권한 테이블 교체가 실패하면 원래 테이블과 데이터를 롤백한다", async (t) => {
  const directory = await fixture(t);

  seed(directory, `${legacy} CREATE VIEW user_view AS SELECT uid FROM user;`);
  await assert.rejects(start(directory), /error in view user_view/);
  const db = new DatabaseSync(path.join(directory, "service.db"), {
    readOnly: true
  });

  try {
    assert.equal(
      db.prepare("SELECT role FROM user WHERE uid = 'old'").get().role,
      -1
    );

    assert.equal(
      db.prepare("SELECT rowid FROM user WHERE uid = 'old'").get().rowid,
      42
    );

    assert.equal(db.prepare("SELECT uid FROM user_view").get().uid, "old");
    assert.equal(
      db
        .prepare("SELECT name FROM sqlite_master WHERE name = 'user_role'")
        .get(),
      undefined
    );

    assert.ok(
      db
        .prepare("SELECT name FROM sqlite_master WHERE name = 'old_update'")
        .get()
    );
  } finally {
    db.close();
  }
});
