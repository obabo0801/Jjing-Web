import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { beforeEach, test } from "node:test";

import { reset, state } from "./fixtures/editor.js";

const fixture = JSON.stringify(
  new URL("./fixtures/editor.js", import.meta.url).href
);

const modules = {
  "#common/dom": `export { create, set, remove, on } from ${fixture}`,
  "#common/dialog": `export { dialog as default } from ${fixture}`,
  "#common/avatar": `export { avatar as default } from ${fixture}`,
  "#common/profile/consent": `export { consent as default } from ${fixture}`,
  "#common/profile": `export { checkName, save } from ${fixture}`,
  "#common/i18n":
    "export const preload = () => {}; export const message = (key) => key;"
};

for (const name of ["drawer", "image", "sheet", "toast"]) {
  modules[`#common/${name}`] =
    `export default () => { throw new Error("Unexpected UI: ${name}"); }`;
}

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

const { default: editor } = await import("#common/profile/editor");

hooks.deregister();

beforeEach((context) => {
  reset();
  context.mock.timers.enable({ apis: ["setTimeout"] });
});

const open = (context, name = "") => {
  const pending = editor({ name });
  const input = state.nodes.find((node) => node.name === "name");
  const status = state.nodes.find((node) => node.className === "setup-status");

  context.after(async () => {
    state.pending.resolve(false);
    await pending;
  });
  return { input, status, pending, action: state.options.actions[0] };
};

const type = (input, value) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const flush = () => new Promise(setImmediate);

test("프로필 생성은 다음 동작을 제출로 지정하고 입력 순서에 맞는 키 힌트를 사용한다", (context) => {
  const { input, action } = open(context);
  const email = state.nodes.find((node) => node.name === "email");

  assert.equal(action.submit, true);
  assert.equal(input.enterKeyHint, "next");
  assert.equal(email.enterKeyHint, "done");
});

test("입력과 검사 대기 중에는 다음 버튼을 활성화하거나 저장하지 않는다", async (context) => {
  const { input, action } = open(context);

  assert.equal(state.disabled, true);
  type(input, "nickname");
  assert.equal(state.disabled, true);
  context.mock.timers.tick(299);
  assert.equal(state.checks.length, 0);
  context.mock.timers.tick(1);
  assert.equal(state.checks.length, 1);
  assert.equal(state.disabled, true);
  await action.run({});
  assert.equal(state.saves.length, 0);
  state.checks[0].resolve({ ok: true, data: { available: true } });
  await flush();
  assert.equal(state.disabled, false);
  await action.run({});
  assert.equal(state.saves.length, 1);
  assert.equal(state.disabled, true);
});

test("기존 닉네임도 서버 검사 성공 후 진행할 수 있다", async (context) => {
  open(context, "existing");

  assert.equal(state.disabled, true);
  context.mock.timers.tick(300);
  assert.equal(state.checks[0].name, "existing");
  state.checks[0].resolve({ ok: true, data: { available: true } });
  await flush();
  assert.equal(state.disabled, false);
});

for (const failure of ["response", "exception", "unavailable"]) {
  test(`검사 실패(${failure})에서는 다음 버튼을 비활성화한다`, async (context) => {
    const { input, status, action } = open(context);

    type(input, "nickname");
    context.mock.timers.tick(300);
    if (failure === "exception") {
      state.checks[0].reject(new Error("offline"));
    } else {
      state.checks[0].resolve({
        ok: failure === "unavailable",
        data: { available: false }
      });
    }
    await flush();
    assert.equal(state.disabled, true);
    assert.equal(
      status.textContent,
      failure === "unavailable"
        ? "setup.nameUnavailable"
        : "setup.nameCheckError"
    );
    await action.run({});
    assert.equal(state.saves.length, 0);
  });
}

test("이전 입력의 늦은 응답은 최신 검사 결과를 덮어쓰지 않는다", async (context) => {
  const { input, status } = open(context);

  type(input, "first");
  context.mock.timers.tick(300);
  type(input, "second");
  context.mock.timers.tick(300);
  state.checks[1].resolve({ ok: true, data: { available: true } });
  await flush();
  state.checks[0].resolve({ ok: true, data: { available: false } });
  await flush();
  assert.equal(state.disabled, false);
  assert.equal(status.textContent, "setup.nameAvailable");
});

test("검사 성공 후 다시 입력하면 즉시 비활성화한다", async (context) => {
  const { input, status } = open(context);

  type(input, "first");
  context.mock.timers.tick(300);
  state.checks[0].resolve({ ok: true, data: { available: true } });
  await flush();
  assert.equal(state.disabled, false);
  type(input, "second");
  assert.equal(state.disabled, true);
  type(input, "!");
  context.mock.timers.tick(300);
  assert.equal(state.checks.length, 1);
  assert.equal(state.disabled, true);
  assert.equal(status.textContent, "setup.nameInvalid");
});

test("창을 닫은 후 도착한 응답은 상태를 갱신하지 않는다", async (context) => {
  const { input, status, pending } = open(context);

  type(input, "nickname");
  context.mock.timers.tick(300);
  state.pending.resolve(false);
  await pending;
  state.checks[0].resolve({ ok: true, data: { available: true } });
  await flush();
  assert.equal(status.textContent, "setup.nameChecking");
  assert.equal(state.disabled, true);
});

test("예약된 검사는 창을 닫으면 취소된다", async (context) => {
  const { input, pending } = open(context);

  type(input, "nickname");
  state.pending.resolve(false);
  await pending;
  context.mock.timers.tick(300);
  assert.equal(state.checks.length, 0);
});
