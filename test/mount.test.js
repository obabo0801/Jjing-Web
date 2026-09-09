import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

import { Element, document, window } from "./fixtures/mount.js";

const saved = { document: globalThis.document, window: globalThis.window };

globalThis.document = document;
globalThis.window = window;
after(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
});

const modules = {
  "#common/chatting": "export default () => {};",
  "#common/sound": "export default { play() {}, music() {} };",
  "#common/vibrate": "export default { play() {} };",
  "#common/back": "export const add = () => () => {};",
  "#common/css": "export const set = () => {}; export const remove = () => {};",
  "#common/popover":
    "export default () => { throw new Error('Unexpected popover'); };",
  "#common/scroll": "export const pause = () => () => {};",
  "#common/drawer":
    "export default () => { throw new Error('Unexpected drawer'); };",
  "#common/i18n":
    "export const preload = () => {}; export const message = key => key;"
};

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
const { default: mount, register } = await import("#common/mount");
const { default: group } = await import("#common/group");
const { default: chatting } = await import("#common/chatting");
const { default: range } = await import("#common/range");
const dom = await import("#common/dom");
const select = await import("#common/select");
const stepper = await import("#common/stepper");
const toggle = await import("#common/toggle");
const picker = await import("#common/picker");
const keypad = await import("#common/keypad");

hooks.deregister();

register(
  group,
  chatting,
  range,
  select.default,
  stepper.default,
  picker.default,
  toggle.default
);

test("컴포넌트 import와 빈 DOM mount는 전역 이벤트를 등록하지 않는다", () => {
  mount(new Element());
  mount(new Element());
  for (const target of [document, window, window.visualViewport])
    assert.equal(target.listeners.length, 0);
});

test("listen은 반복 호출해도 전역 이벤트를 한 번만 등록한다", () => {
  for (const component of [select, stepper, toggle, picker, keypad])
    component.listen();
  const targets = [document, window, window.visualViewport];
  const counts = targets.map((target) => target.listeners.length);

  assert.ok(counts.every((count) => count > 0));
  for (const component of [select, stepper, toggle, picker, keypad])
    component.listen();
  mount(new Element());
  assert.deepEqual(
    targets.map((target) => target.listeners.length),
    counts
  );
});

test("DOM 탐색은 root 자체·중첩 요소를 포함하고 범위 밖은 제외한다", () => {
  const root = new Element("div", [".target"]);
  const child = new Element("span", [".target"]);
  const outside = new Element("span", [".target"]);

  root.append(child);
  document.body.append(root, outside);
  assert.deepEqual(dom.find(".target", root), [root, child]);
  assert.deepEqual(dom.all(".target", root), [child]);
  assert.deepEqual(dom.find(".target", null), []);
  root.remove();
  outside.remove();
});

test("중첩 group도 준비하며 재마운트 시 같은 스타일을 추가하지 않는다", () => {
  const root = new Element("div", ['.group[data-view="grid"]']);
  const child = new Element("div", ['.group[data-view="grid"]']);
  const count = document.head.children.length;

  root.setAttribute("data-columns", 21);
  child.setAttribute("data-columns", 22);
  root.append(child);
  mount(root);
  assert.equal(document.head.children.length, count + 2);
  mount(root);
  assert.equal(document.head.children.length, count + 2);
});

const field = () => {
  const root = new Element("div", [".select"]);
  const input = new Element("select");
  const option = new Element("option");

  option.textContent = "Choice";
  input.options = [option];
  input.selectedOptions = [option];
  input.selectedIndex = 0;
  root.append(input);
  return root;
};

test("중첩 select를 만들고 재마운트 시 버튼·메뉴를 중복 생성하지 않는다", () => {
  const root = field();
  const child = field();

  root.append(child);
  mount(root);
  assert.equal(root.querySelectorAll(".select-toggle").length, 2);
  assert.equal(root.querySelectorAll(".select-menu").length, 2);
  mount(root);
  assert.equal(root.querySelectorAll(".select-toggle").length, 2);
  assert.equal(root.querySelectorAll(".select-menu").length, 2);
});

test("range input 자체를 마운트하고 기존 이벤트를 유지하며 표시를 갱신한다", () => {
  const root = new Element("div", [".range"]);
  const input = new Element("input", ['.range input[type="range"]']);
  const fill = new Element("div", [".range-fill"]);
  const thumb = new Element("div", [".range-thumb"]);

  Object.assign(input, { min: "0", max: "100", value: "25" });
  root.append(input, fill, thumb);
  mount(input);
  assert.equal(fill.style.width, "25%");
  const count = input.listeners.length;

  assert.ok(count > 0);
  input.value = "75";
  mount(input);
  assert.equal(input.listeners.length, count);
  assert.equal(fill.style.width, "75%");
  assert.equal(thumb.style.insetInlineStart, "75%");
});

test("stepper input 자체를 마운트하면 표시값을 준비한다", () => {
  const root = new Element("div", [".stepper"]);
  const field = new Element("div", [".stepper-value"]);
  const input = new Element("input", [".stepper-value input"]);
  const number = new Element("span", [".stepper-number"]);

  input.value = "7";
  field.append(input, number);
  root.append(field);
  mount(input);
  assert.equal(input.type, "text");
  assert.equal(input.inputMode, "none");
  assert.equal(number.textContent, "7");
  const counts = [document, window, window.visualViewport].map(
    (target) => target.listeners.length
  );

  mount(input);
  assert.deepEqual(
    [document, window, window.visualViewport].map(
      (target) => target.listeners.length
    ),
    counts
  );
});

test("재마운트 후 stepper 클릭 한 번은 값 한 단계만 변경한다", () => {
  const root = new Element("div", [".stepper"]);
  const field = new Element("div", [".stepper-value"]);
  const input = new Element("input", [".stepper-value input"]);
  const number = new Element("span", [".stepper-number"]);
  const button = new Element("button", [".stepper button[data-step]:enabled"]);

  Object.assign(input, { value: "7", min: "0", max: "10", step: "1" });
  button.setAttribute("data-step", "1");
  field.append(input, number);
  root.append(field, button);
  mount(root);
  mount(root);
  stepper.listen();
  document.listeners
    .filter((item) => item.type === "click")
    .forEach((item) => item.listener({ target: button }));
  assert.equal(input.value, "8");
});

test("중첩 toggle의 초기 상태와 change 동기화를 유지한다", () => {
  const create = (checked) => {
    const root = new Element("div", [".toggle"]);
    const input = new Element("input", [".toggle-switch input"]);
    const content = new Element("div", [".toggle-content"]);

    input.checked = checked;
    input.disabled = false;
    root.queries.set(
      ':scope > .toggle-head .toggle-switch input[type="checkbox"]',
      [input]
    );
    root.append(input, content);
    return { root, input, content };
  };
  const first = create(false);
  const second = create(true);

  first.content.append(second.root);
  mount(first.root);
  assert.equal(first.content.disabled, true);
  assert.equal(second.content.disabled, false);
  first.input.checked = true;
  document.listeners
    .filter((item) => item.type === "change")
    .forEach((item) => item.listener({ target: first.input }));
  assert.equal(first.content.disabled, false);
  assert.equal(first.content.inert, false);
});
