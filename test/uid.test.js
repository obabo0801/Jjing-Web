import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { beforeEach, test } from "node:test";

import cookieParser from "cookie-parser";

import identity, { key } from "#config/uid";

const secret = "test-only-cookie-secret";
const uid = "test-user";

beforeEach((context) => {
  const saved = process.env.COOKIE_SECRET;

  process.env.COOKIE_SECRET = secret;
  context.after(() => {
    if (saved === undefined) {
      delete process.env.COOKIE_SECRET;
    } else {
      process.env.COOKIE_SECRET = saved;
    }
  });
});

const signed = (value, secret) => {
  const signature = createHmac("sha256", secret)
    .update(value)
    .digest("base64")
    .replace(/=+$/, "");

  return `s:${value}.${signature}`;
};

const request = (value) => {
  const req = {
    headers:
      value === undefined
        ? {}
        : { cookie: `${key}=${encodeURIComponent(value)}` }
  };

  cookieParser(process.env.COOKIE_SECRET)(req, {}, (error) => {
    assert.ifError(error);
  });
  return req;
};

test("정상 서명된 UID 쿠키를 사용한다", () => {
  assert.equal(identity(request(signed(uid, secret))), uid);
});

test("다른 secret으로 서명된 쿠키와 변조된 UID를 거부한다", () => {
  assert.equal(identity(request(signed(uid, "wrong-secret"))), "");
  assert.equal(
    identity(request(signed(uid, secret).replace(uid, "another-user"))),
    ""
  );
});

test("secret이 있으면 일반 쿠키와 누락된 쿠키를 거부한다", () => {
  assert.equal(identity(request(uid)), "");
  assert.equal(identity(request()), "");
});

test("secret이 없어도 일반 UID 쿠키를 신뢰하지 않는다", () => {
  delete process.env.COOKIE_SECRET;
  assert.equal(identity(request(uid)), "");
});

test("서명 쿠키의 값이 문자열이 아니면 신원으로 사용하지 않는다", () => {
  for (const value of [false, null, 1, { uid }]) {
    assert.equal(identity({ signedCookies: { [key]: value } }), "");
  }
});
