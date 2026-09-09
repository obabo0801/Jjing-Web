export default async function migrate({ exec, get, run, all }, backup) {
  const columns = await all("PRAGMA table_info(user)");

  for (const name of ["initial", "lang"]) {
    if (!columns.some((column) => column.name === name)) {
      await exec(`ALTER TABLE user ADD COLUMN ${name} TEXT;`);
    }
  }

  if (!columns.some(({ name }) => name === "setup")) {
    await exec(`
      ALTER TABLE user
      ADD COLUMN setup INTEGER NOT NULL DEFAULT 0
        CHECK (setup IN (0, 1))
    `);
  }

  const table = await get(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'user'"
  );

  if (/CHECK\s*\(\s*role\s+IN\s*\(\s*-1\s*,\s*0\s*\)\s*\)/i.test(table.sql)) {
    await run("VACUUM INTO ?", [backup()]);
    const objects = await all(
      "SELECT sql FROM sqlite_master WHERE tbl_name = 'user' AND type IN ('index', 'trigger') AND sql IS NOT NULL"
    );

    const schema = table.sql
      .replace(/CREATE TABLE\s+["`\[]?user["`\]]?/i, "CREATE TABLE user_role")
      .replace(
        /CHECK\s*\(\s*role\s+IN\s*\(\s*-1\s*,\s*0\s*\)\s*\)/i,
        "CHECK (role IN (-2, -1, 0))"
      );

    try {
      await exec(`BEGIN IMMEDIATE;
        ${schema};
        INSERT INTO user_role (rowid, ${columns.map(({ name }) => `"${name}"`).join(", ")})
          SELECT rowid, ${columns.map(({ name }) => `"${name}"`).join(", ")} FROM user;
        DROP TABLE user;
        ALTER TABLE user_role RENAME TO user;
        ${objects.map(({ sql }) => `${sql};`).join("\n")}
        COMMIT;`);
    } catch (error) {
      await exec("ROLLBACK;");
      throw error;
    }
  }

  if (!columns.some(({ name }) => name === "consent")) {
    await exec("ALTER TABLE user ADD COLUMN consent TEXT;");
  }

  const blocks = await all("PRAGMA table_info(block)");

  for (const name of ["actor", "handler"]) {
    if (!blocks.some((column) => column.name === name)) {
      await exec(`ALTER TABLE block ADD COLUMN ${name} TEXT;`);
    }
  }

  // 기존 시작 시 보정: 차단된 관리자의 권한 회수와 처리자 기록을 유지합니다.
  await exec(`
    BEGIN IMMEDIATE;
    INSERT INTO authority (uid, actor, handler)
      SELECT user.uid,
        (SELECT actor FROM block WHERE uid = user.uid OR ip = user.ip ORDER BY time DESC, rowid DESC LIMIT 1),
        (SELECT handler FROM block WHERE uid = user.uid OR ip = user.ip ORDER BY time DESC, rowid DESC LIMIT 1)
      FROM user
      WHERE role = -1 AND EXISTS (SELECT 1 FROM block WHERE uid = user.uid OR ip = user.ip)
      ON CONFLICT(uid) DO UPDATE SET actor = excluded.actor, handler = excluded.handler;
    UPDATE user SET role = 0
      WHERE role = -1 AND EXISTS (SELECT 1 FROM block WHERE uid = user.uid OR ip = user.ip);
    COMMIT;
  `);
}
