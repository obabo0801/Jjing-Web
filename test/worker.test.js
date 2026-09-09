import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

import { database } from "./fixtures/pwa.js";

const source = await readFile(
  new URL("../public/service-work.js", import.meta.url),
  "utf8"
);

const worker = (options = {}) => {
  const handlers = new Map();
  const messages = [];
  const notifications = [];
  const opened = [];
  const self = {
    location: { origin: "https://example.test" },
    addEventListener: (type, callback) => handlers.set(type, callback),
    registration: {
      showNotification: async (...args) => notifications.push(args)
    },
    clients: {
      matchAll: async () => [{ postMessage: (data) => messages.push(data) }],
      openWindow: async (url) => opened.push(url)
    }
  };

  runInNewContext(source, {
    self,
    URL,
    Response,
    atob,
    indexedDB: options.indexedDB,
    caches: options.caches,
    fetch:
      options.fetch ||
      (() => {
        throw new Error("Unexpected network request");
      })
  });
  return { self, handlers, messages, notifications, opened };
};

test("Worker는 기존 큐의 요청을 재전송하고 완료된 항목만 제거한다", async () => {
  const db = database();
  const sent = [];

  db.rows.push({
    id: 1,
    url: "/api/first",
    options: { method: "POST", body: "one" }
  });
  db.rows.push({ id: 2, url: "/api/second", options: { method: "DELETE" } });
  const env = worker({
    indexedDB: db.indexedDB,
    fetch: async (...args) => {
      sent.push(args);
      return new Response(null, { status: sent.length === 1 ? 400 : 503 });
    }
  });

  let task;

  env.handlers.get("sync")({
    tag: "api-sync",
    waitUntil: (value) => (task = value)
  });
  await assert.rejects(task);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].id, 2);
  assert.deepEqual(db.calls[0], ["open", "sync", 1]);
  assert.deepEqual(sent, [
    ["/api/first", { method: "POST", body: "one" }],
    ["/api/second", { method: "DELETE" }]
  ]);
});

test("Worker는 탐색 요청의 503 응답을 캐시된 offline 페이지로 대체한다", async () => {
  const cached = new Response("offline");
  const env = worker({
    caches: {
      match: async (key) => {
        assert.equal(key, "/offline");
        return cached;
      }
    },
    fetch: async () => new Response(null, { status: 503 })
  });

  let response;

  env.handlers.get("fetch")({
    request: {
      url: "https://example.test/profile",
      method: "GET",
      mode: "navigate"
    },
    respondWith: (value) => (response = value)
  });
  assert.equal(await response, cached);
});

test("Worker push는 OS 알림과 페이지 notify 메시지 형식을 유지한다", async () => {
  const env = worker();
  const data = {
    title: "Title",
    body: "Body",
    image: "/image.webp",
    url: "/chat"
  };

  let task;

  env.handlers.get("push")({
    data: { json: () => data },
    waitUntil: (value) => (task = value)
  });
  await task;
  assert.deepEqual(JSON.parse(JSON.stringify(env.messages)), [
    { type: "notify", data }
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(env.notifications)), [
    [
      "Title",
      {
        body: "Body",
        icon: "/icons/icon-192.png",
        image: "/image.webp",
        data: { url: "/chat" }
      }
    ]
  ]);
});

test("알림 클릭의 외부 URL은 같은 사이트 홈으로 제한한다", async () => {
  const env = worker();

  let task;
  let closed = false;

  env.self.clients.matchAll = async () => [];
  env.handlers.get("notificationclick")({
    notification: {
      data: { url: "https://outside.test/" },
      close: () => (closed = true)
    },
    waitUntil: (value) => (task = value)
  });
  await task;
  assert.equal(closed, true);
  assert.deepEqual(env.opened, ["https://example.test/"]);
});

test("겹친 동기화는 같은 작업을 공유하고 처리 중 추가된 요청도 한 번씩 전송한다", async () => {
  const db = database();
  const sent = [];

  let release;

  const gate = new Promise((resolve) => (release = resolve));

  db.rows.push({ id: 1, url: "/api/first", options: { method: "POST" } });
  const env = worker({
    indexedDB: db.indexedDB,
    fetch: async (url) => {
      sent.push(url);
      await gate;
      return new Response(null, { status: 200 });
    }
  });

  let first;
  let second;

  env.handlers.get("sync")({
    tag: "api-sync",
    waitUntil: (task) => (first = task)
  });
  await new Promise((resolve) => setImmediate(resolve));
  db.rows.push({ id: 2, url: "/api/second", options: { method: "POST" } });
  env.handlers.get("message")({
    data: { type: "sync" },
    waitUntil: (task) => (second = task)
  });
  assert.equal(first, second);
  assert.deepEqual(sent, ["/api/first"]);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(sent, ["/api/first", "/api/second"]);
  assert.deepEqual(db.rows, []);
});

test("동기화 실패 후 잠금을 풀고 남아 있는 요청을 다시 처리한다", async () => {
  const db = database();

  let failed = true;
  let count = 0;

  db.rows.push({ id: 1, url: "/api/test", options: { method: "POST" } });
  const env = worker({
    indexedDB: db.indexedDB,
    fetch: async () => {
      count++;
      return new Response(null, { status: failed ? 503 : 200 });
    }
  });

  const run = () => {
    let task;

    env.handlers.get("message")({
      data: { type: "sync" },
      waitUntil: (value) => (task = value)
    });
    return task;
  };

  await assert.rejects(run());
  assert.equal(db.rows.length, 1);
  failed = false;
  await run();
  assert.equal(count, 2);
  assert.deepEqual(db.rows, []);
});
