import assert from "node:assert/strict";
import { test } from "node:test";

import mount, { register } from "#common/mount";

test("초기화 누락은 DOM 준비를 조용히 생략하지 않고 알린다", () => {
  assert.throws(() => mount({}), /registered by init/);
});

test("등록 순서·중복 방지·새 DOM과 반복 mount의 동기 실행을 유지한다", () => {
  const calls = [];
  const first = (root) => calls.push(["first", root]);
  const second = (root) => calls.push(["second", root]);
  const page = {};
  const layer = {};

  register(first, second);
  register(first, second);
  mount(page);
  mount(layer);
  mount(layer);
  assert.deepEqual(calls, [
    ["first", page],
    ["second", page],
    ["first", layer],
    ["second", layer],
    ["first", layer],
    ["second", layer]
  ]);
});

test("컴포넌트 오류를 숨기거나 이후 컴포넌트를 잘못 실행하지 않는다", () => {
  let called = false;

  register(
    () => {
      throw new Error("component failed");
    },
    () => {
      called = true;
    }
  );
  assert.throws(() => mount({}), /component failed/);
  assert.equal(called, false);
});
