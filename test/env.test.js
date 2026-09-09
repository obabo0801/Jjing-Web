import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const secret = " test-only-persistent-secret ";
const file = new URL("../config/env.js", import.meta.url).href;

const check = (mode, value = secret) => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !key.startsWith("DOTENV_") &&
        !["COOKIE_SECRET", "NODE_ENV"].includes(key)
    )
  );

  // 존재하지 않는 전용 경로로 실제 .env 로드를 방지합니다.
  env.DOTENV_CONFIG_PATH = path.join(tmpdir(), randomUUID(), "missing.env");
  if (mode !== undefined) env.NODE_ENV = mode;
  if (value !== null) env.COOKIE_SECRET = value;

  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    const config = await import(${JSON.stringify(file)});
    console.log(JSON.stringify({
      mode: process.env.NODE_ENV,
      preserved: config.default === ${JSON.stringify(value)}
    }));
  `
    ],
    { env, encoding: "utf8", timeout: 5000 }
  );
};

for (const value of [null, "", "   "]) {
  test(`secret ${JSON.stringify(value)}이면 시작을 거부한다`, () => {
    const result = check("production", value);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /COOKIE_SECRET is required/);
  });
}

for (const mode of [undefined, "production", "development", "test"]) {
  test(`실행 환경 ${mode ?? "누락"}을 안전하게 처리하고 secret을 그대로 유지한다`, () => {
    const result = check(mode);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      mode: mode || "production",
      preserved: true
    });
  });
}

test("잘못된 실행 환경은 개발 모드로 조용히 동작하지 않는다", () => {
  const result = check("prodution");

  assert.equal(result.status, 1);
  assert.match(result.stderr, /NODE_ENV must be/);
});
