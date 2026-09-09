import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

import { body, calls } from "./fixtures/init.js";

const fixture = JSON.stringify(
  new URL("./fixtures/init.js", import.meta.url).href
);
const modules = { "#common/dom": `export { body, create } from ${fixture};` };

for (const name of [
  "device",
  "icon",
  "button",
  "accordion",
  "input",
  "tooltip",
  "choice",
  "switch",
  "group",
  "chatting",
  "range",
  "mount",
  "segment",
  "scroll",
  "drag",
  "progress",
  "select",
  "stepper",
  "toggle",
  "picker",
  "keypad"
]) {
  modules[`#common/${name}`] = `
    import { record } from ${fixture};
    export default (...args) => record(${JSON.stringify(name)}, ...args);
    export const listen = () => record(${JSON.stringify(`${name}.listen`)});
    export const register = (...items) => record("register", ...items);
  `;
}
modules["#ui/theme"] =
  `import { record } from ${fixture}; export default () => record("theme");`;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    return modules[specifier]
      ? {
          url: `data:text/javascript,${encodeURIComponent(modules[specifier])}`,
          shortCircuit: true
        }
      : next(specifier, context);
  }
});
const { default: init } = await import("#src/init");

hooks.deregister();

test("페이지 초기화는 장치·테마·공통 이벤트·최초 mount 순서로 실행한다", () => {
  const loading = init();

  assert.equal(loading.className, "loading");
  assert.deepEqual(body.children, [loading]);
  assert.deepEqual(
    calls.map((call) => call.name),
    [
      "register",
      "progress",
      "device",
      "theme",
      "icon",
      "button",
      "accordion",
      "input",
      "tooltip",
      "choice",
      "switch",
      "segment",
      "select.listen",
      "stepper.listen",
      "toggle.listen",
      "picker.listen",
      "keypad.listen",
      "mount",
      "scroll",
      "drag"
    ]
  );

  assert.equal(calls[0].args.length, 7);
  const count = calls.length;
  const root = {};

  calls[0].args.forEach((component) => component(root));
  assert.deepEqual(
    calls.slice(count).map(({ name }) => name),
    ["group", "chatting", "range", "select", "stepper", "picker", "toggle"]
  );
  assert.ok(calls.slice(count).every(({ args }) => args[0] === root));
  calls.splice(count);
  assert.deepEqual(calls[1].args, [
    { type: "circular", value: 25, show: false, target: loading }
  ]);
});

test("다시 init을 호출해도 로딩·이벤트·최초 mount를 중복 실행하지 않는다", () => {
  const loading = init();
  const count = calls.length;

  assert.equal(init(), loading);
  assert.equal(calls.length, count);
  assert.deepEqual(body.children, [loading]);
  loading.remove();
  assert.equal(init(), loading);
  assert.equal(calls.length, count);
  assert.deepEqual(body.children, []);
});
