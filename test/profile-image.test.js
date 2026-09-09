import assert from "node:assert/strict";
import { once } from "node:events";
import { registerHooks } from "node:module";
import { after, before, beforeEach, test } from "node:test";

import express from "express";
import sharp from "sharp";

import * as links from "#service/profile";
import limit from "#shared/upload";
import { messages } from "./fixtures/profile.js";

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (
      [
        "#db",
        "#service/events",
        "#service/log/recent",
        "#service/manage"
      ].includes(specifier)
    ) {
      return {
        url: new URL("./fixtures/profile.js", import.meta.url).href,
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

app.use("/profile", profile);
app.use((error, req, res, next) => res.status(error.status || 500).end());

let server;
let base;
let png;
let token;

before(async () => {
  png = await sharp({
    create: { width: 96, height: 96, channels: 4, background: "red" }
  })
    .png()
    .toBuffer();
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/profile/image/link`;
});

beforeEach(() => {
  tokens.forEach(links.remove);
  tokens.length = 0;
  messages.length = 0;
  token = links.create("owner");
  tokens.push(token);
});

after(async () => {
  tokens.forEach(links.remove);
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

const upload = (body, edit, type = "image/png", value = token) =>
  fetch(`${base}/${value}`, {
    method: "POST",
    headers: {
      "Content-Type": type,
      ...(edit === undefined ? {} : { "X-Image-Edit": edit })
    },
    body
  });

test("QR 이미지 원본 업로드 후 연결된 사용자에게 알린다", async () => {
  const response = await upload(png);

  assert.equal(response.status, 204);
  assert.deepEqual(links.get(token).file, png);
  assert.equal(links.get(token).type, "image/png");
  assert.deepEqual(messages, [
    { uid: "owner", type: "profile-image", data: { token } }
  ]);
});

test("QR 편집 정보를 적용한 이미지는 WebP로 전달한다", async () => {
  const response = await upload(
    png,
    JSON.stringify({
      width: 64,
      height: 64,
      shape: "circle",
      angle: 90,
      scale: 2
    })
  );

  assert.equal(response.status, 204);
  const item = links.get(token);
  const metadata = await sharp(item.file).metadata();

  assert.equal(item.type, "image/webp");
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 64);
  assert.equal(metadata.height, 64);
  assert.equal(messages.length, 1);
});

test("편집하지 않은 GIF는 애니메이션 원본을 그대로 전달한다", async () => {
  const frames = Buffer.alloc(64 * 128 * 4);

  frames.fill(Buffer.from([255, 0, 0, 255]), 0, 64 * 64 * 4);
  frames.fill(Buffer.from([0, 0, 255, 255]), 64 * 64 * 4);
  const gif = await sharp(frames, {
    raw: { width: 64, height: 128, channels: 4, pageHeight: 64 }
  })
    .gif({ delay: [100, 200], loop: 0 })
    .toBuffer();
  const response = await upload(gif, undefined, "image/gif");

  assert.equal((await sharp(gif, { animated: true }).metadata()).pages, 2);
  assert.equal(response.status, 204);
  assert.deepEqual(links.get(token).file, gif);
  assert.equal(links.get(token).type, "image/gif");
});

test("손상된 편집 JSON은 기존처럼 원본 업로드로 처리한다", async () => {
  assert.equal((await upload(png, "{invalid")).status, 204);
  assert.deepEqual(links.get(token).file, png);
});

test("빈 본문과 만료된 QR 링크는 저장하거나 알리지 않는다", async () => {
  assert.equal((await upload(Buffer.alloc(0))).status, 400);
  assert.equal(links.get(token).file, undefined);
  links.get(token).expires = Date.now() - 1;
  assert.equal((await upload(png)).status, 404);
  assert.equal(messages.length, 0);
});

test("이미지 변환 실패는 415로 응답하고 기존 이미지를 유지한다", async () => {
  links.get(token).file = png;
  const response = await upload(
    Buffer.from("invalid-image"),
    JSON.stringify({ width: 64 })
  );

  assert.equal(response.status, 415);
  assert.deepEqual(links.get(token).file, png);
  assert.equal(messages.length, 0);
});

test("15MB까지 허용하고 초과 업로드는 413으로 거부한다", async () => {
  assert.equal((await upload(Buffer.alloc(limit))).status, 204);
  messages.length = 0;
  assert.equal((await upload(Buffer.alloc(limit + 1))).status, 413);
  assert.equal(links.get(token).file.length, limit);
  assert.equal(messages.length, 0);
});
