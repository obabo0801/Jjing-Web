import assert from "node:assert/strict";
import { test } from "node:test";

import api from "#common/api";

test("API 접두사와 JSON 요청·응답 계약을 유지한다", async (context) => {
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/profile");
    assert.equal(options.method, "PATCH");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.equal(options.headers["X-Test"], "value");
    assert.deepEqual(JSON.parse(options.body), { name: "test" });
    return Response.json({ saved: true });
  });

  const result = await api("/profile", {
    method: "PATCH",
    headers: { "X-Test": "value" },
    data: { name: "test" }
  });

  assert.deepEqual(result, { ok: true, status: 200, data: { saved: true } });
});

test("본문 없는 응답을 JSON으로 읽지 않는다", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 204 })
  );

  assert.deepEqual(await api("/profile"), {
    ok: true,
    status: 204,
    data: null
  });
});

test("HTTP 실패와 네트워크 실패를 구분한다", async (context) => {
  const fetch = context.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "conflict" }, { status: 409 })
  );

  assert.deepEqual(await api("/profile"), {
    ok: false,
    status: 409,
    data: { error: "conflict" }
  });

  fetch.mock.mockImplementation(async () => {
    throw new TypeError("offline");
  });

  assert.deepEqual(await api("/profile"), { ok: false, status: 0, data: null });
});
