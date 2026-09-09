import assert from "node:assert/strict";
import { once } from "node:events";
import { registerHooks } from "node:module";
import { after, before, beforeEach, test } from "node:test";

import cookieParser from "cookie-parser";
import express from "express";

import { key } from "#config/uid";
import * as role from "#shared/role";
import { db, get, records, run } from "./fixtures/user.js";

const secret = "test-only-user-secret";
const ip = "192.0.2.10";
const saved = { secret: process.env.COOKIE_SECRET, mode: process.env.NODE_ENV };

process.env.COOKIE_SECRET = secret;
process.env.NODE_ENV = "production";

// 실제 라우트의 DB·접속 로그만 메모리 구현으로 대체합니다.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (["#db", "#service/log/access"].includes(specifier)) {
      return {
        url: new URL("./fixtures/user.js", import.meta.url).href,
        shortCircuit: true
      };
    }

    return next(specifier, context);
  }
});

const { default: users } = await import("#router/user");
const { default: admin } = await import("#middleware/admin");

hooks.deregister();

const app = express();

app.use(cookieParser(secret));
app.use(express.json());
app.use((req, res, next) => {
  Object.defineProperty(req, "ip", { value: req.get("x-test-ip") || ip });
  next();
});
app.use("/user", users);
app.get("/admin", admin, (req, res) => res.json({ uid: req.user.uid }));

let server;
let base;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  db.exec("DELETE FROM user; DELETE FROM block;");
  records.length = 0;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  db.close();

  for (const [name, value] of [
    ["COOKIE_SECRET", saved.secret],
    ["NODE_ENV", saved.mode]
  ]) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

const seed = (uid, value = role.user) =>
  run(
    "INSERT INTO user (uid, role, ip, initial, lang) VALUES (?, ?, ?, ?, ?)",
    [uid, value, ip, ip, "ko-KR"]
  );

const visit = (cookie, address = ip) =>
  fetch(`${base}/user`, {
    method: "POST",
    headers: {
      "Accept-Language": "ko-KR",
      "x-test-ip": address,
      ...(cookie ? { cookie } : {})
    }
  });

const issued = async () => {
  const response = await visit();

  assert.equal(response.status, 200);
  return {
    ...(await response.json()),
    cookie: response.headers.get("set-cookie").split(";")[0]
  };
};

for (const value of [role.user, role.admin, role.root]) {
  test(`공유 IP의 역할 ${value} 사용자를 복원하거나 강등하지 않는다`, async () => {
    seed("existing-user", value);
    const response = await visit();
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.notEqual(body.uid, "existing-user");
    assert.equal(
      get("SELECT role FROM user WHERE uid = ?", ["existing-user"]).role,
      value
    );

    assert.equal(
      get("SELECT role FROM user WHERE uid = ?", [body.uid]).role,
      role.user
    );
    assert.equal(get("SELECT COUNT(*) AS count FROM user").count, 2);
  });
}

test("일반 UID 쿠키로 관리자를 가장할 수 없다", async () => {
  seed("existing-admin", role.admin);
  const cookie = `${key}=existing-admin`;

  assert.equal(
    (await fetch(`${base}/admin`, { headers: { cookie } })).status,
    403
  );
  const response = await visit(cookie);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.notEqual(body.uid, "existing-admin");
  assert.equal(
    get("SELECT role FROM user WHERE uid = 'existing-admin'").role,
    role.admin
  );
});

test("발급 쿠키는 서명되고 운영용 보안 속성을 포함한다", async () => {
  const response = await visit();
  const cookie = response.headers.get("set-cookie");
  const { uid } = await response.json();
  const value = decodeURIComponent(cookie.split(";")[0].slice(key.length + 1));

  assert.equal(cookieParser.signedCookie(value, secret), uid);
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) {
    assert.ok(cookie.includes(attribute));
  }
});

test("서명된 사용자는 IP가 바뀌어도 UID와 관리자 권한을 유지한다", async () => {
  const user = await issued();

  run("UPDATE user SET role = ? WHERE uid = ?", [role.admin, user.uid]);
  const response = await visit(user.cookie, "192.0.2.20");

  assert.equal((await response.json()).uid, user.uid);
  assert.equal(get("SELECT COUNT(*) AS count FROM user").count, 1);
  assert.equal(
    get("SELECT ip FROM user WHERE uid = ?", [user.uid]).ip,
    "192.0.2.20"
  );

  assert.equal(
    (await fetch(`${base}/admin`, { headers: { cookie: user.cookie } })).status,
    200
  );
});

test("변조된 서명 쿠키는 관리자 권한과 기존 UID를 얻지 못한다", async () => {
  const user = await issued();

  run("UPDATE user SET role = ? WHERE uid = ?", [role.admin, user.uid]);
  const cookie = `${user.cookie}tampered`;

  assert.equal(
    (await fetch(`${base}/admin`, { headers: { cookie } })).status,
    403
  );
  const response = await visit(cookie);

  assert.notEqual((await response.json()).uid, user.uid);
});

test("쿠키 삭제 후 같은 IP로 방문해도 기존 프로필을 복원하지 않는다", async () => {
  const user = await issued();
  const removed = await fetch(`${base}/user`, {
    method: "DELETE",
    headers: { cookie: user.cookie }
  });

  assert.equal(removed.status, 204);
  assert.ok(removed.headers.get("set-cookie").includes(`${key}=;`));
  assert.notEqual((await issued()).uid, user.uid);
});

test("IP 차단은 유지하되 같은 IP의 사용자 쿠키를 발급하지 않는다", async () => {
  seed("blocked-user");
  run("INSERT INTO block (uid, ip, reason) VALUES (?, ?, ?)", [
    "blocked-user",
    ip,
    "blocked"
  ]);
  const response = await visit();

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(get("SELECT COUNT(*) AS count FROM user").count, 1);
  assert.equal(records.length, 1);
  assert.equal(records[0][0], null);
});
