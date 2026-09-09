import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, test } from "node:test";
import { Element, document, window } from "./fixtures/mount.js";

const frames = new Map();
const observers = [];

let frame = 0;

const globals = {
  document,
  window,
  requestAnimationFrame: (run) => {
    frames.set(++frame, run);
    return frame;
  },
  cancelAnimationFrame: (id) => frames.delete(id),
  MutationObserver: class {
    constructor(run) {
      this.run = run;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.closed = true;
    }
  }
};

const saved = Object.fromEntries(
  Object.keys(globals).map((key) => [key, globalThis[key]])
);

Object.assign(globalThis, globals);
after(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
});

const match = Element.prototype.matches;

Element.prototype.matches = function (selector) {
  if (selector === ".select-option:enabled")
    return this.className === "select-option" && !this.disabled;
  if (selector === ".select-option[data-selected]:enabled")
    return (
      this.className === "select-option" &&
      !this.disabled &&
      this.getAttribute("data-selected") !== null
    );
  if (selector === ":popover-open") return this.showing === true;
  return match.call(this, selector);
};

Element.prototype.contains = function (node) {
  return node === this || this.children.some((child) => child.contains(node));
};

Element.prototype.focus = function () {
  document.activeElement = this;
};
Element.prototype.scrollIntoView = function () {};
Element.prototype.showPopover = function () {
  this.showing = true;
};

Element.prototype.hidePopover = function () {
  this.showing = false;
};

Element.prototype.getBoundingClientRect = function () {
  return this.rect || { top: 100, bottom: 140, left: 20, width: 180 };
};

Element.prototype.cloneNode = function (deep) {
  const copy = new Element(this.tag);

  copy.className = this.className;
  copy.dataset = { ...this.dataset };
  copy.attributes = new Map(this.attributes);
  copy.disabled = this.disabled;
  copy.textContent = this.textContent;
  if (deep) copy.append(...this.children.map((child) => child.cloneNode(true)));
  return copy;
};

Object.defineProperty(Element.prototype, "isConnected", {
  get() {
    return document.contains(this);
  }
});

Object.defineProperty(Element.prototype, "scrollHeight", {
  get() {
    return 240;
  }
});

Object.assign(document.documentElement, {
  clientWidth: 400,
  clientHeight: 700
});

const modules = {
  "#common/sound": "export default { play() {} };",
  "#common/vibrate": "export default { play() {} };",
  "#common/back":
    "export const stack=[]; export const add=run=>{stack.push(run);return ()=>{const i=stack.indexOf(run);if(i>=0)stack.splice(i,1)}};",
  "#common/css":
    "export const values=new WeakMap(); export const set=(el,v)=>values.set(el,{...values.get(el),...v}); export const remove=el=>values.delete(el);",
  "#common/popover":
    "export const calls=[]; export default options=>new Promise(resolve=>{calls.push({options,resolve})});"
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
const select = await import("#common/select");
const css = await import("#common/css");
const back = await import("#common/back");
const layer = await import("#common/popover");

Object.defineProperty(Element.prototype, "offsetHeight", {
  get() {
    return Math.min(
      240,
      parseFloat(css.values.get(this)?.["max-height"]) || 240
    );
  }
});

hooks.deregister();
select.listen();

const emit = (type, target, extra = {}) => {
  const event = { target, preventDefault() {}, ...extra };

  document.listeners
    .filter((item) => item.type === type)
    .forEach((item) => item.listener(event));
};

const flush = () => {
  const runs = [...frames.values()];

  frames.clear();
  runs.forEach((run) => run());
};

const field = (expand = false) => {
  const root = new Element("div");
  const input = new Element("select");

  root.className = "select";
  input.options = ["하나", "둘", "셋"].map((text) => {
    const option = new Element("option");

    option.textContent = text;
    return option;
  });
  input.selectedIndex = 0;
  Object.defineProperty(input, "selectedOptions", {
    get: () => [input.options[input.selectedIndex]]
  });
  if (expand) root.setAttribute("data-expand", "");
  root.append(input);
  document.body.append(root);
  select.default(root);
  return {
    root,
    input,
    toggle: root.querySelector(".select-toggle"),
    list: root.querySelector(".select-menu")
  };
};

test("기본 메뉴는 top layer로 열고 바깥 클릭 시 CSS·뒤로가기를 정리한다", () => {
  const { root, toggle, list } = field();

  emit("click", toggle);
  flush();
  assert.equal(list.getAttribute("popover"), "manual");
  assert.equal(list.showing, true);
  assert.equal(css.values.get(list)["--select-top"], "144px");
  assert.equal(css.values.get(list).width, "180px");
  assert.equal(back.stack.length, 1);
  emit("pointerdown", document.body);
  assert.equal(root.getAttribute("data-open"), null);
  assert.equal(list.showing, false);
  assert.equal(css.values.has(list), false);
  assert.equal(back.stack.length, 0);
});

test("하단 공간이 부족하면 위로 표시하고 스크롤 위치를 다시 측정한다", () => {
  const { toggle, list } = field();

  toggle.rect = { top: 620, bottom: 660, left: 300, width: 180 };
  emit("click", toggle);
  assert.equal(css.values.get(list)["--select-top"], "376px");
  assert.equal(css.values.get(list)["--select-left"], "212px");
  toggle.rect.top = 500;
  toggle.rect.bottom = 540;
  emit("scroll", document);
  flush();
  assert.equal(css.values.get(list)["--select-top"], "256px");
  back.stack.at(-1)();
});

test("data-expand는 popover 없이 기존 메뉴를 펼치고 선택 이벤트는 변경 때만 발생한다", () => {
  const { root, input, toggle, list } = field(true);
  const events = [];

  input.addEventListener("input", () => events.push("input"));
  input.addEventListener("change", () => events.push("change"));
  emit("click", toggle);
  assert.equal(root.getAttribute("data-open"), "");
  assert.equal(list.getAttribute("popover"), null);
  emit("click", list.children[1]);
  assert.equal(input.selectedIndex, 1);
  assert.deepEqual(events, ["input", "change"]);
  emit("click", toggle);
  emit("click", list.children[1]);
  assert.deepEqual(events, ["input", "change"]);
});

test("키보드 이동은 비활성 옵션을 건너뛰며 Tab으로 닫는다", () => {
  const { toggle, list } = field();

  list.children[1].disabled = true;
  emit("click", toggle);
  flush();
  emit("keydown", list.children[0], { key: "ArrowDown" });
  assert.equal(document.activeElement, list.children[2]);
  emit("keydown", list.children[2], { key: "Home" });
  assert.equal(document.activeElement, list.children[0]);
  emit("keydown", list.children[0], { key: "Tab" });
  assert.equal(list.showing, false);
});

test("원본 DOM 제거 시 열린 메뉴와 뒤로가기 등록을 정리한다", () => {
  const { root, toggle, list } = field();

  emit("click", toggle);
  root.remove();
  observers.at(-1).run();
  assert.equal(list.showing, false);
  assert.equal(back.stack.length, 0);
  assert.equal(observers.at(-1).closed, true);
});

test("wearable은 data-expand보다 우선하며 전체화면·왼쪽 swipe와 선택값을 연결한다", async () => {
  document.documentElement.className = "wearable";
  const { root, input, toggle, list } = field(true);

  emit("click", toggle);
  const call = layer.calls.at(-1);

  assert.equal(call.options.fullscreen, true);
  assert.equal(call.options.direction, "left");
  assert.equal(call.options.translate, false);
  assert.equal(call.options.anchor, undefined);
  assert.equal(call.options.content.getAttribute("data-pan"), "");
  assert.equal(
    call.options.content.children[1].getAttribute("data-layer-action"),
    "1"
  );
  assert.equal(call.options.content.children[1].getAttribute("data-pan"), "");
  assert.equal(list.parent, root);
  call.options.ready(null, call.resolve);
  emit("pointerdown", call.options.content);
  call.resolve("1");
  await Promise.resolve();
  assert.equal(input.selectedIndex, 1);
  assert.equal(root.getAttribute("data-open"), null);
  document.documentElement.className = "";
});

test("wearable 열기 대기 중 중복 클릭·취소는 창이나 선택값을 중복 처리하지 않는다", async () => {
  document.documentElement.className = "wearable";
  const { root, input, toggle } = field();
  const count = layer.calls.length;

  emit("click", toggle);
  emit("click", toggle);
  emit("click", toggle);
  assert.equal(layer.calls.length, count + 1);
  const call = layer.calls.at(-1);

  call.options.ready(null, call.resolve);
  await Promise.resolve();
  assert.equal(input.selectedIndex, 0);
  assert.equal(root.getAttribute("data-open"), null);
  document.documentElement.className = "";
});
