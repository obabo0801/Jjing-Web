import assert from "node:assert/strict";
import { test } from "node:test";

import once from "#common/once";

test("같은 키의 작업은 진행 중에 한 번만 실행한다", async () => {
  const trigger = once();
  const pending = Promise.withResolvers();

  let calls = 0;

  const first = trigger("profile", () => {
    calls += 1;
    return pending.promise;
  });

  const second = await trigger("profile", () => {
    calls += 1;
  });

  assert.equal(second, false);
  assert.equal(calls, 1);
  pending.resolve("opened");
  assert.equal(await first, "opened");
  assert.equal(await trigger("profile", () => "reopened"), "reopened");
});

test("다른 키의 작업과 독립된 실행기는 서로 막지 않는다", async () => {
  const trigger = once();
  const other = once();
  const pending = Promise.withResolvers();
  const first = trigger("profile", () => pending.promise);

  assert.equal(await trigger("image", () => "image"), "image");
  assert.equal(await other("profile", () => "other"), "other");
  pending.resolve();
  await first;
});

test("동기 예외 후에도 같은 키를 다시 실행할 수 있다", async () => {
  const trigger = once();

  await assert.rejects(
    trigger("profile", () => {
      throw new Error("failed");
    }),
    /failed/
  );
  assert.equal(await trigger("profile", () => true), true);
});

test("비동기 실패 후에도 같은 키를 다시 실행할 수 있다", async () => {
  const trigger = once();

  await assert.rejects(
    trigger("profile", () => Promise.reject(new Error("failed"))),
    /failed/
  );
  assert.equal(await trigger("profile", () => true), true);
});
