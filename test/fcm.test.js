import assert from "node:assert/strict";
import { once } from "node:events";
import { registerHooks } from "node:module";
import { after, before, beforeEach, test } from "node:test";
import express from "express";

import { state } from "./fixtures/fcm.js";

const project = process.env.GOOGLE_CLOUD_PROJECT;
const url = new URL("./fixtures/fcm.js", import.meta.url).href;
const modules = {
  "firebase-admin/app": `export { initializeApp, applicationDefault } from '${url}';`,
  "firebase-admin/messaging": `export { getMessaging } from '${url}';`,
  "#db": `export { all, run } from '${url}';`,
  "#middleware/admin": `export { admin as default } from '${url}';`,
  "#service/log/notify": `export { record as default } from '${url}';`,
  "#service/image": `export { unused as default } from '${url}';`,
  "#service/push": `export const enabled = false; export { unused as default } from '${url}';`
};

const hooks = registerHooks({
  resolve(specifier, context, next) {
    return modules[specifier]
      ? {
          url: `data:text/javascript,${encodeURIComponent(modules[specifier])}`,
          shortCircuit: true
        }
      : next(specifier, context);
  }
});

process.env.GOOGLE_CLOUD_PROJECT = "local-fcm-test";
const { default: send, invalid } = await import("#service/fcm");
const { default: router } = await import("#router/admin");
const app = express();

app.use(express.json());
app.use("/", router);

let server;
let base;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  state.calls.length = 0;
  state.deleted.length = 0;
  state.records.length = 0;
  state.results.clear();
  state.rows.clear();
  state.error = null;
});

after(async () => {
  hooks.deregister();
  if (project === undefined) delete process.env.GOOGLE_CLOUD_PROJECT;
  else process.env.GOOGLE_CLOUD_PROJECT = project;
  await new Promise((resolve) => server.close(resolve));
});

const permanent = [
  "messaging/installation-id-not-registered",
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered"
];

const temporary = [
  "messaging/authentication-error",
  "messaging/invalid-credential",
  "messaging/server-unavailable",
  "messaging/internal-error",
  "messaging/message-rate-exceeded",
  "messaging/quota-exceeded",
  "app/network-error",
  "ECONNRESET",
  "messaging/unknown-error",
  "messaging/installation-id-not-registered-extra",
  404
];
const value = { title: "test", body: "body", image: "", url: "/" };

test("미등록 FID와 기존 두 오류 코드만 정확히 정리 대상으로 분류한다", () => {
  permanent.forEach((code) => assert.equal(invalid({ code }), true, code));
  temporary.forEach((code) =>
    assert.equal(invalid({ code }), false, String(code))
  );
  assert.equal(invalid({ message: "not registered", statusCode: 404 }), false);
  assert.equal(invalid(), false);
  assert.equal(invalid(null), false);
});

test("500개씩 fids로 전송하며 경계 전후 개별 응답의 FID 매핑을 유지한다", async () => {
  const fids = Array.from({ length: 1001 }, (_, index) => `fid-${index}`);

  for (const index of [0, 499, 500, 999, 1000]) {
    state.results.set(fids[index], {
      success: false,
      error: { code: permanent[0] }
    });
  }
  const results = await send(fids, value);

  assert.deepEqual(
    state.calls.map(({ fids }) => fids.length),
    [500, 500, 1]
  );

  assert.deepEqual(
    results.map(({ fid }) => fid),
    fids
  );

  state.calls.forEach((request) => {
    assert.equal(Object.hasOwn(request, "tokens"), false);
    assert.deepEqual(request.data, value);
    assert.deepEqual(request.android, { priority: "high", ttl: 300_000 });
  });

  results.forEach((result, index) => {
    assert.deepEqual(result, {
      fid: fids[index],
      ...(state.results.get(fids[index]) ?? {
        success: true,
        messageId: `message:${fids[index]}`
      })
    });
  });
});

test("관리자 발송은 미등록 대상만 삭제하고 성공·일시 실패·비발송 FID는 보존한다", async () => {
  state.rows.set("success", { fid: "success", device: "wearable" });
  state.rows.set("other", { fid: "other", device: "phone" });
  for (const [index, code] of [...permanent, ...temporary].entries()) {
    const fid = `fid-${index}`;

    state.rows.set(fid, { fid, device: "wearable" });
    state.results.set(fid, { success: false, error: { code } });
  }
  const response = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value)
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    sent: 1,
    failed: temporary.length
  });
  assert.deepEqual(state.deleted.sort(), ["fid-0", "fid-1", "fid-2"]);
  assert.deepEqual(
    [...state.rows.keys()].sort(),
    [
      "success",
      "other",
      ...temporary.map((_, index) => `fid-${index + permanent.length}`)
    ].sort()
  );
  assert.equal(state.calls[0].fids.includes("other"), false);
  assert.deepEqual(state.records, [["test-admin", "test", "body", "", "/"]]);
});

test("SDK 전체 요청이 실패해도 FID를 삭제하지 않는다", async () => {
  for (const fid of ["first", "second"])
    state.rows.set(fid, { fid, device: "wearable" });
  state.error = Object.assign(new Error("offline"), {
    code: "app/network-error"
  });
  const response = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value)
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sent: 0, failed: 2 });
  assert.deepEqual(state.deleted, []);
  assert.deepEqual([...state.rows.keys()], ["first", "second"]);
});
