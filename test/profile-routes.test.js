import assert from "node:assert/strict";
import { once } from "node:events";
import { registerHooks } from "node:module";
import { after, before, beforeEach, test } from "node:test";

import express from "express";

import { key } from "#config/uid";
import * as media from "#config/media";
import * as consent from "#shared/consent";
import * as links from "#service/profile";
import { db, get, run, calls, reset } from "./fixtures/profile-routes.js";

const fixture = JSON.stringify(
  new URL("./fixtures/profile-routes.js", import.meta.url).href
);

const modules = {
  "#db": `export { get, run } from ${fixture}`,
  "#service/events": `export { send, broadcast, state } from ${fixture}`,
  "#service/manage": `export { management as default } from ${fixture}`,
  "#service/log/recent": `export { recent as default } from ${fixture}`,
  "#service/image": `export { store as default, transform } from ${fixture}`
};

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (modules[specifier]) {
      return {
        url: `data:text/javascript,${encodeURIComponent(modules[specifier])}`,
        shortCircuit: true
      };
    }
    return next(specifier, context);
  }
});

const { default: profile } = await import("#router/profile");

hooks.deregister();

const app = express();
const tokens = [];
const agreement = { terms: consent.terms, privacy: consent.privacy };
const details = {
  name: "nickname",
  email: "user@example.com",
  consent: agreement
};

app.use(express.json());
// 테스트 전용 서버 안에서만 서명 검증 후의 UID를 재현합니다.
app.use((req, res, next) => {
  req.signedCookies = { [key]: req.get("x-test-uid") || "" };
  next();
});
app.use("/profile", profile);
app.use((error, req, res, next) => res.status(error.status || 500).end());

let server;
let base;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/profile`;
});

beforeEach(async () => {
  reset();
  tokens.splice(0).forEach(links.remove);
  for (const [uid, role] of [
    ["owner", 0],
    ["other", 0],
    ["admin", -1],
    ["root", -2]
  ]) {
    await run(
      "INSERT INTO user (uid, role, ip, initial, lang, image, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        uid,
        role,
        `ip-${uid}`,
        "initial-ip",
        "ko-KR",
        "/upload/users/original/test.webp",
        "/upload/users/resizing/test.webp"
      ]
    );
  }
});

after(async () => {
  tokens.forEach(links.remove);
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  db.close();
});

const request = (path, method = "GET", body, uid = "owner", headers = {}) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      "x-test-uid": uid,
      ...(body &&
        !Buffer.isBuffer(body) && { "Content-Type": "application/json" }),
      ...headers
    },
    body: Buffer.isBuffer(body) ? body : body ? JSON.stringify(body) : undefined
  });

const draft = () => request("/", "PATCH", details);

test("본인 확인 없는 생성·완료·이미지·링크·조회 요청은 거부한다", async () => {
  for (const [path, method, body] of [
    ["/name?name=valid", "GET"],
    ["/", "PATCH", details],
    ["/complete", "POST", { consent: agreement }],
    ["/image", "POST"],
    ["/image/link", "POST"],
    ["/me", "GET"]
  ]) {
    assert.equal((await request(path, method, body, "")).status, 403);
  }
});

test("이름 검사 경로는 UID 조회에 가려지지 않고 만료된 초안을 정리한다", async () => {
  await run(
    "INSERT INTO draft (uid, name, email, time) VALUES (?, ?, '', '2000-01-01')",
    ["other", "nickname"]
  );

  assert.deepEqual(await (await request("/name?name=nickname")).json(), {
    available: true
  });
  assert.equal(await get("SELECT 1 FROM draft"), undefined);
  assert.deepEqual(await (await request("/name?name=!")).json(), {
    available: false
  });
  await draft();
  assert.deepEqual(
    await (
      await request("/name?name=NICKNAME", "GET", undefined, "other")
    ).json(),
    { available: false }
  );

  assert.deepEqual(await (await request("/name?name=nickname")).json(), {
    available: true
  });
});

test("초안 저장의 검증·동의·응답과 완료 시 데이터 반영을 유지한다", async () => {
  assert.equal(
    (await request("/", "PATCH", { ...details, name: "!" })).status,
    400
  );

  assert.equal(
    (await request("/", "PATCH", { ...details, email: "invalid" })).status,
    400
  );

  assert.equal(
    (await request("/", "PATCH", { ...details, consent: null })).status,
    412
  );
  const saved = await draft();

  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), {
    name: details.name,
    email: details.email,
    number: 1,
    avatar: media.resolve("/upload/users/resizing/test.webp")
  });

  assert.equal(
    (await get("SELECT setup FROM user WHERE uid = 'owner'")).setup,
    0
  );
  assert.equal((await request("/complete", "POST", {})).status, 412);
  assert.equal(
    (await request("/complete", "POST", { consent: agreement })).status,
    204
  );
  const user = await get("SELECT * FROM user WHERE uid = 'owner'");

  assert.equal(user.name, details.name);
  assert.equal(user.email, details.email);
  assert.equal(user.setup, 1);
  assert.equal(user.image, "/upload/users/original/test.webp");
  assert.equal(JSON.parse(user.consent).terms, consent.terms);
  assert.equal(JSON.parse(user.consent).privacy, consent.privacy);
  assert.ok(Number.isFinite(Date.parse(JSON.parse(user.consent).time)));
  assert.equal(await get("SELECT 1 FROM draft"), undefined);
  assert.equal(
    (await request("/complete", "POST", { consent: agreement })).status,
    409
  );
});

test("기존 사용자나 다른 초안과 닉네임이 겹치면 409를 반환한다", async () => {
  await run("UPDATE user SET name = 'nickname' WHERE uid = 'other'");
  assert.equal((await draft()).status, 409);
  await run("UPDATE user SET name = NULL WHERE uid = 'other'");
  await run(
    "INSERT INTO draft (uid, name, email) VALUES ('other', 'nickname', '')"
  );
  assert.equal((await draft()).status, 409);
});

test("이미지 업로드는 초안이 있어야 하며 조절값과 응답·저장 경로를 유지한다", async () => {
  const file = Buffer.from("image");
  const edit = { shape: "circle", scale: 2, angle: 90 };
  const headers = {
    "Content-Type": "image/png",
    "x-image-edit": JSON.stringify(edit)
  };

  assert.equal(
    (await request("/image", "POST", file, "owner", headers)).status,
    403
  );
  await draft();
  assert.equal((await request("/image", "POST", undefined)).status, 400);
  const response = await request("/image", "POST", file, "owner", headers);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    image: "/original.webp",
    avatar: "/avatar.webp"
  });

  assert.deepEqual(calls.images[0], [
    file,
    "users",
    { width: 256, height: 256, fit: "cover", quality: 85, edit }
  ]);
  const saved = await get(
    "SELECT image, avatar FROM draft WHERE uid = 'owner'"
  );

  assert.equal(saved.image, "/original.webp");
  assert.equal(saved.avatar, "/avatar.webp");
  calls.image = null;
  assert.equal(
    (await request("/image", "POST", file, "owner", headers)).status,
    415
  );
});

test("QR 이미지 조회와 적용은 소유자에게만 허용하고 적용 후 토큰을 제거한다", async () => {
  const token = links.create("owner");
  const item = links.get(token);

  tokens.push(token);
  assert.equal((await request(`/image/link/${token}/use`, "POST")).status, 409);
  item.file = Buffer.from("image");
  item.type = "image/png";
  assert.equal(
    (await request(`/image/link/${token}`, "GET", undefined, "other")).status,
    404
  );
  const image = await request(`/image/link/${token}`);

  assert.equal(image.headers.get("cache-control"), "no-store");
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.equal(await image.text(), "image");
  assert.equal((await request(`/image/link/${token}/use`, "POST")).status, 409);
  await draft();
  assert.equal((await request(`/image/link/${token}/use`, "POST")).status, 204);
  assert.equal(links.get(token), null);
  assert.equal(
    (await get("SELECT image FROM draft WHERE uid = 'owner'")).image,
    "/original.webp"
  );
});

test("QR 링크는 UID별로 10회 제한과 Retry-After를 유지한다", async () => {
  for (let count = 0; count < 10; count++) {
    const response = await request("/image/link", "POST", undefined, "limited");
    const { token } = await response.json();

    tokens.push(token);
    assert.equal(response.status, 200);
    assert.equal(links.get(token).uid, "limited");
  }
  const response = await request("/image/link", "POST", undefined, "limited");

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
});

test("프로필 조회는 본인·일반 사용자·관리자·총 관리자별 공개 범위를 유지한다", async () => {
  await run(
    "INSERT INTO block (uid, reason, actor, handler) VALUES ('owner', 'reason', 'root', 'handler')"
  );
  await run("INSERT INTO authority (uid, memo) VALUES ('owner', 'memo')");
  for (const uid of ["owner", "other", "admin", "root"]) {
    const response = await request("/owner", "GET", undefined, uid);
    const user = await response.json();
    const manage = uid === "admin" || uid === "root";

    assert.equal(response.status, 200);
    assert.equal(user.self, uid === "owner");
    assert.equal(user.manage, manage);
    assert.equal(user.blocked, true);
    assert.equal(user.state, "online");
    assert.equal(Boolean(user.details), manage);
    assert.equal(Boolean(user.block), manage);
    assert.equal(Boolean(user.authority), uid === "root");
    if (manage) {
      assert.equal(user.details.os, "test-os");
      assert.equal(user.details.lang, "ko-KR");
      assert.equal(user.block.reason, "reason");
    }
    if (uid === "root") assert.equal(user.authority.memo, "memo");
  }
  assert.equal((await (await request("/me")).json()).uid, "owner");
  assert.equal((await request("/missing")).status, 404);
  assert.equal(
    (await request("/owner", "GET", undefined, "missing")).status,
    403
  );

  assert.equal(
    (await (await request("/admin", "GET", undefined, "root")).json()).manage,
    true
  );

  assert.equal(
    (await (await request("/root", "GET", undefined, "admin")).json()).manage,
    false
  );
});

test("차단과 해제는 관리자·사유 검사 후 관리 서비스와 기존 이벤트를 호출한다", async () => {
  for (const method of ["POST", "DELETE"]) {
    assert.equal(
      (await request("/owner/block", method, { reason: "reason" })).status,
      403
    );

    assert.equal(
      (await request("/owner/block", method, {}, "admin")).status,
      400
    );

    assert.equal(
      (
        await request(
          "/owner/block",
          method,
          { reason: "x".repeat(501) },
          "admin"
        )
      ).status,
      400
    );
  }
  assert.equal(calls.management.length, 0);
  assert.equal(
    (await request("/owner/block", "POST", { reason: " reason " }, "admin"))
      .status,
    204
  );

  assert.deepEqual(calls.management[0], [
    "admin",
    "owner",
    "block",
    { reason: "reason" }
  ]);

  assert.deepEqual(
    calls.messages.map(({ type }) => type),
    ["block", "role", "chatting-block", "profile-update"]
  );
  calls.messages.length = 0;
  assert.equal(
    (await request("/owner/block", "DELETE", { reason: " undo " }, "admin"))
      .status,
    204
  );

  assert.deepEqual(calls.management[1], [
    "admin",
    "owner",
    "unblock",
    { reason: "undo" }
  ]);

  assert.deepEqual(
    calls.messages.map(({ type }) => type),
    ["chatting-unblock", "role", "profile-update"]
  );
});

test("권한 변경은 총 관리자만 허용하고 메모만 바꿀 때 role 이벤트를 보내지 않는다", async () => {
  for (const uid of ["owner", "admin"]) {
    assert.equal(
      (await request("/other/authority", "PATCH", { enabled: true }, uid))
        .status,
      403
    );
  }
  for (const value of [
    {},
    { enabled: 1 },
    { memo: null },
    { memo: "x".repeat(501) }
  ]) {
    assert.equal(
      (await request("/other/authority", "PATCH", value, "root")).status,
      400
    );
  }
  assert.equal(calls.management.length, 0);
  assert.equal(
    (
      await request(
        "/other/authority",
        "PATCH",
        { enabled: true, memo: " memo " },
        "root"
      )
    ).status,
    204
  );

  assert.deepEqual(calls.management[0], [
    "root",
    "other",
    "authority",
    { enabled: true, memo: "memo" }
  ]);

  assert.deepEqual(calls.messages[0], {
    uid: "other",
    type: "role",
    data: { role: -1 }
  });
  calls.messages.length = 0;
  assert.equal(
    (await request("/other/authority", "PATCH", { memo: "new" }, "root"))
      .status,
    204
  );

  assert.deepEqual(calls.messages, [
    { type: "profile-update", data: { uid: "other" } }
  ]);
});

test("관리 서비스의 거부 상태를 전달하고 실패 시 이벤트를 보내지 않는다", async () => {
  calls.error = { status: 409 };
  for (const [path, method, body] of [
    ["/owner/block", "POST", { reason: "reason" }],
    ["/owner/block", "DELETE", { reason: "reason" }],
    ["/owner/authority", "PATCH", { enabled: true }]
  ]) {
    assert.equal((await request(path, method, body, "root")).status, 409);
  }
  assert.equal(calls.messages.length, 0);
});
