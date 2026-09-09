import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { test } from "node:test";

import * as events from "#service/events";
import * as links from "#service/profile";
import { langs, locale } from "#service/locale";
import { now } from "#service/log";
import record from "#service/log/block";

test("서비스 import가 실제 파일로 연결되고 이전 config 경로를 사용하지 않는다", async () => {
  const root = new URL("../", import.meta.url);
  const moved =
    /#config\/(?:events|image|manage|profile|tts|stt|speech|fcm|push|locale|log)(?=["'/])/;
  const found = new Set();

  for (const directory of [
    "config",
    "db",
    "service",
    "router",
    "middleware",
    "build",
    "src/js"
  ]) {
    const base = new URL(`${directory}/`, root);
    const files = await readdir(base, { recursive: true });

    for (const file of files.filter((name) => name.endsWith(".js"))) {
      const source = await readFile(
        new URL(file.replaceAll("\\", "/"), base),
        "utf8"
      );

      assert.doesNotMatch(source, moved, `${directory}/${file}`);
      for (const [, specifier] of source.matchAll(
        /["'](#service\/[^"']+)["']/g
      ))
        found.add(specifier);
    }
  }
  assert.ok(found.has("#service/log"));
  assert.ok(found.has("#service/manage"));
  for (const specifier of found) {
    const resolved = new URL(import.meta.resolve(specifier));

    assert.ok(
      resolved.href.startsWith(new URL("service/", root).href),
      specifier
    );
    assert.ok((await stat(resolved)).isFile(), specifier);
  }
});

test("프로필 이미지 링크의 소유자·만료·연장·삭제 동작을 유지한다", (t) => {
  let time = 1000000;

  t.mock.method(Date, "now", () => time);
  const first = links.create("first");
  const second = links.create("second");

  t.after(() => {
    links.remove(first);
    links.remove(second);
  });
  assert.notEqual(first, second);
  assert.equal(links.get(first).uid, "first");
  assert.equal(links.get(second).uid, "second");
  time += 4 * 60 * 1000;
  links.refresh(links.get(first));
  time += 2 * 60 * 1000;
  assert.equal(links.valid(first), true);
  assert.equal(links.valid(second), false);
  assert.equal(links.get(second), null);
  assert.equal(links.remove(first), true);
  assert.equal(links.valid(first), false);
});

const response = () => {
  const chunks = [];

  return {
    write: (chunk) => chunks.push(chunk),
    messages: () =>
      chunks
        .join("")
        .split("\n\n")
        .filter(Boolean)
        .map((message) => {
          const [event, data] = message.split("\n");

          return { type: event.slice(7), data: JSON.parse(data.slice(6)) };
        })
  };
};

test("SSE 연결·개별 전송·전체 전송·마지막 연결 종료를 유지한다", (t) => {
  const first = response();
  const second = response();
  const other = response();
  const closeFirst = events.connect({ uid: "same", role: 0 }, first);
  const closeSecond = events.connect({ uid: "same", role: 0 }, second);
  const closeOther = events.connect({ uid: "other", role: -1 }, other);

  t.after(() => {
    closeFirst();
    closeSecond();
    closeOther();
  });

  assert.deepEqual(first.messages()[0], {
    type: "ready",
    data: { uid: "same", role: 0, state: "online" }
  });
  events.send("same", "private", { value: 1 });
  assert.equal(first.messages().at(-1).type, "private");
  assert.equal(second.messages().at(-1).type, "private");
  assert.equal(
    other.messages().some((message) => message.type === "private"),
    false
  );
  events.broadcast("public", { value: 2 });
  assert.equal(other.messages().at(-1).type, "public");
  closeFirst();
  closeFirst();
  assert.equal(events.state("same"), "online");
  closeSecond();
  assert.equal(events.state("same"), "offline");
  assert.equal(events.touch("same"), false);
  assert.deepEqual(other.messages().at(-1), {
    type: "presence",
    data: { uid: "same", state: "offline" }
  });
});

test("SSE 자리 비움 판정과 활동 갱신을 유지한다", (t) => {
  let time = 1000000;

  t.mock.method(Date, "now", () => time);
  const target = response();
  const close = events.connect({ uid: "idle", role: 0 }, target);

  t.after(close);
  time += 10 * 60 * 1000;
  assert.equal(events.state("idle"), "away");
  assert.equal(events.touch("idle"), true);
  assert.equal(events.state("idle"), "online");
});

test("번역 파일을 기존 점 구분 키로 제공한다", async () => {
  const { default: ko } = await import("../locales/ko.js");

  assert.ok(langs.includes("ko"));
  assert.equal(locale("ko")["app.title"], ko.app.title);
  assert.equal(locale("ko")["offline.heading"], ko.offline.heading);
  assert.equal(locale("missing"), null);
});

test("로그 시각과 차단 기록의 값 순서를 유지한다", async (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-09-08T15:12:34Z"));
  assert.equal(now(), "2026-09-09 00:12:34");
  const calls = [];

  await record(
    (sql, params) => calls.push({ sql, params }),
    { uid: "user", ip: "192.0.2.1" },
    { uid: "root", name: "" },
    "unblock",
    "reason",
    now()
  );
  assert.match(calls[0].sql, /INSERT INTO audit\.block/);
  assert.deepEqual(calls[0].params, [
    "user",
    "192.0.2.1",
    "unblock",
    "reason",
    "root",
    "root",
    "2026-09-09 00:12:34"
  ]);
});
