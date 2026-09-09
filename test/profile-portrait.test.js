import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { beforeEach, test } from "node:test";

import limit from "#shared/upload";
import { reset, state } from "./fixtures/portrait.js";

const fixture = JSON.stringify(
  new URL("./fixtures/portrait.js", import.meta.url).href
);

const modules = {
  "#common/dom": `export { create, set, remove, on, has } from ${fixture}`,
  "#common/avatar": `export { avatar as default } from ${fixture}`,
  "#common/sheet": `export { sheet as default } from ${fixture}`,
  "#common/image": `export { edit as default } from ${fixture}`,
  "#common/toast": `export { toast as default } from ${fixture}`,
  "#common/profile": `export { onLink, linkImage, clearLink } from ${fixture}`,
  "#common/i18n": "export const message = (key) => key;"
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

const { default: portrait } = await import("#common/profile/image");

hooks.deregister();

beforeEach((context) => {
  reset();

  context.mock.method(URL, "createObjectURL", (file) => {
    const url = `blob:test-${state.urls.length}`;

    state.urls.push({ url, file });
    return url;
  });

  context.mock.method(URL, "revokeObjectURL", (url) => {
    state.revoked.push(url);
  });
});

const flush = () => new Promise(setImmediate);

const open = async (picture) => {
  picture.root.children[0].dispatchEvent(new Event("click"));
  await flush();
  assert.equal(state.sheets.at(-1)?.title, "image.select");
  return state.sheets.at(-1);
};

const choose = async (sheet, file = new Blob(["image"])) => {
  const input = sheet.content.children.find((node) => node.type === "file");

  input.files = [file];
  input.dispatchEvent(new Event("change"));
  await flush();
};

const close = async (sheet, saved) => {
  sheet.resolve(saved);
  await flush();
  assert.equal(state.links.size, 0);
};

const edited = () => ({
  file: new Blob(["original"], { type: "image/gif" }),
  edit: { scale: 2, angle: 90, x: 10, y: 20 }
});

test("아바타와 확인 화면은 같은 이미지를 표시하고 업로드 중 상태를 공유한다", () => {
  const picture = portrait("/avatar", "/original");

  assert.equal(picture.file(), undefined);
  picture.preview();
  assert.equal(state.avatars.at(-1).source, "/avatar");
  picture.busy(true);
  assert.equal(state.avatars[0].root.disabled, true);
  assert.equal(picture.root.attributes.has("data-loading"), true);
  picture.busy(false);
  assert.equal(state.avatars[0].root.disabled, false);
  assert.equal(picture.root.attributes.has("data-loading"), false);
});

test("저장한 원본 파일과 조절값을 유지하고 종료 시 임시 URL을 해제한다", async () => {
  const picture = portrait("/avatar");
  const sheet = await open(picture);

  state.result = edited();
  await choose(sheet, state.result.file);
  assert.equal(picture.file(), undefined);
  assert.equal(state.edits[0].options.shape, "circle");
  assert.equal(state.edits[0].options.width, 512);
  assert.equal(state.edits[0].options.height, 512);
  await close(sheet, true);
  assert.equal(picture.file(), state.result);
  picture.preview();
  assert.equal(state.avatars.at(-1).source, "blob:test-0");
  assert.deepEqual(state.avatars.at(-1).edit, state.result.edit);
  picture.saved();
  assert.equal(picture.file(), undefined);
  picture.preview();
  assert.equal(state.avatars.at(-1).source, "blob:test-0");
  picture.destroy();
  assert.deepEqual(state.revoked, ["blob:test-0"]);
});

test("이미지 선택을 취소하면 임시 파일만 버리고 기존 아바타를 유지한다", async () => {
  const picture = portrait("/avatar");
  const sheet = await open(picture);

  state.result = edited();
  await choose(sheet);
  await close(sheet, false);
  assert.equal(picture.file(), undefined);
  assert.equal(state.avatars[0].source, "/avatar");
  assert.deepEqual(state.revoked, ["blob:test-0"]);
});

test("다시 선택한 이미지를 취소해도 이전에 저장한 파일은 유지한다", async () => {
  const picture = portrait("/avatar");
  const first = await open(picture);
  const previous = edited();

  state.result = previous;
  await choose(first);
  await close(first, true);

  const second = await open(picture);

  state.result = edited();
  await choose(second);
  await close(second, false);
  assert.equal(picture.file(), previous);
  assert.equal(state.avatars[0].source, "blob:test-0");
  assert.deepEqual(state.revoked, ["blob:test-1"]);
  picture.destroy();
  assert.deepEqual(state.revoked, ["blob:test-1", "blob:test-0"]);
});

test("초기화 후 저장하면 업로드 대기 파일을 비우고 기존 아바타로 돌아간다", async () => {
  const picture = portrait("/avatar");
  const first = await open(picture);

  state.result = edited();
  await choose(first);
  await close(first, true);

  const second = await open(picture);

  second.actions[0].run();
  await close(second, true);
  assert.equal(picture.file(), undefined);
  assert.equal(state.avatars[0].source, "/avatar");
  assert.deepEqual(state.revoked, ["blob:test-0"]);
});

test("용량 초과 파일은 조절 창을 열지 않고 기존 안내 키를 사용한다", async () => {
  const picture = portrait("/avatar");
  const sheet = await open(picture);

  await choose(sheet, { size: limit + 1 });
  assert.equal(state.edits.length, 0);
  assert.equal(state.urls.length, 0);
  assert.equal(state.notices[0].title, "image.sizeError");
  await close(sheet, false);
});

test("이미지 조절 취소 시 업로드 대기 파일이나 임시 URL을 만들지 않는다", async () => {
  const picture = portrait("/avatar");
  const sheet = await open(picture);

  await choose(sheet);
  await close(sheet, true);
  assert.equal(state.edits.length, 1);
  assert.equal(state.urls.length, 0);
  assert.equal(picture.file(), undefined);
});

test("QR 수신 이미지를 반영하고 선택 화면을 닫으면 수신 구독을 해제한다", async () => {
  const picture = portrait("/avatar");
  const sheet = await open(picture);

  state.links.forEach((listener) => listener("token"));
  assert.equal(state.avatars.at(-1).source, "/image/link/token");
  await close(sheet, true);
  assert.equal(state.avatars[0].source, "/image/link/token");
  assert.equal(picture.file(), undefined);
  assert.equal(state.cleared, 0);
});

test("기존 아바타 재조절은 썸네일 대신 원본을 불러온다", async (context) => {
  const picture = portrait("/avatar", "/original");
  const sheet = await open(picture);
  const file = new Blob(["original"]);
  const fetch = context.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    blob: async () => file
  }));

  state.result = edited();
  sheet.content.children[0].dispatchEvent(new Event("click"));
  await flush();
  assert.equal(fetch.mock.calls[0].arguments[0], "/original");
  assert.equal(state.edits[0].file, file);
  assert.equal(state.edits[0].options.anchor, sheet.content.children[0]);
  await close(sheet, true);
  assert.equal(picture.file(), state.result);
});
