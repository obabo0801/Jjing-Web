import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";

import express from "express";

import router from "#router/i18n";
import { content } from "#shared/route";
import { langs, locale } from "#service/locale";

const app = express();
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64");
const decode = (value) => JSON.parse(Buffer.from(value, "base64").toString());
// 브라우저와 같은 Web Crypto로 서버의 hash 규칙을 교차 검사합니다.
const key = async (value) =>
  Buffer.from(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value.toLowerCase())
    )
  )
    .toString("hex")
    .slice(0, 8);

app.use(express.json());
app.use(router);

let server;
let base;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("언어 목록과 오프라인 번역 파일은 기존 hash 경로·응답을 유지한다", async () => {
  const response = await fetch(base);
  const files = decode((await response.json())[content]);

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(files), langs);
  for (const lang of langs) {
    assert.equal(files[lang], await key(lang));
    const result = await fetch(`${base}/${files[lang]}`);
    const data = decode((await result.json())[content]);

    assert.equal(result.status, 200);
    assert.deepEqual(data, {
      lang,
      text: Object.fromEntries(
        ["app.title", "offline.heading", "offline.action"]
          .filter((name) => Object.hasOwn(locale(lang), name))
          .map((name) => [name, locale(lang)[name]])
      )
    });
  }

  assert.equal((await fetch(`${base}/unknown`)).status, 404);
});

test("요청한 번역 키는 Web Crypto와 같은 hash로 반환하고 중복·없는 키는 제외한다", async () => {
  const lang = langs[0];
  const names = Object.keys(locale(lang)).slice(0, 4);
  const keys = await Promise.all(names.map(key));
  const response = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      [content]: encode({ lang, keys: [...keys, keys[0], "unknown", null] })
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(decode((await response.json())[content]), {
    lang,
    text: Object.fromEntries(
      names.map((name, i) => [keys[i], locale(lang)[name]])
    )
  });
});

test("시스템 언어 선택과 잘못된 번역 요청의 400 응답을 유지한다", async () => {
  const lang = langs[0];
  const response = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": lang },
    body: JSON.stringify({ [content]: encode({ lang: "system", keys: [] }) })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(decode((await response.json())[content]), {
    lang,
    text: {}
  });
  for (const value of ["invalid", encode(null), encode([])]) {
    const invalid = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [content]: value })
    });

    assert.equal(invalid.status, 400);
  }
});
