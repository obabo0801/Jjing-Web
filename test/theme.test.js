import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

import { Element, document, window } from "./fixtures/mount.js";

const scheme = new EventTarget();
const observers = [];
const values = {
  light: "rgb(255, 255, 255)",
  dark: "rgb(24, 24, 24)",
  black: "rgb(0, 0, 0)"
};

scheme.matches = false;
document.createElement = (tag) =>
  new Element(tag, tag === "meta" ? ['meta[name="theme-color"]'] : []);

const globals = {
  document,
  window,
  Element,
  matchMedia: () => scheme,
  MutationObserver: class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(target, options) {
      this.target = target;
      this.options = options;
    }
  },
  getComputedStyle: (element) => ({
    backgroundColor:
      element.className === "theme-color"
        ? values[document.documentElement.getAttribute("data-theme")]
        : element.background
  })
};

const saved = Object.fromEntries(
  Object.keys(globals).map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key)
  ])
);

for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value
  });
}
after(() => {
  for (const [key, descriptor] of Object.entries(saved)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "#common/storage") {
      return {
        url: "data:text/javascript,export const get = (_, fallback) => fallback; export const set = () => {};",
        shortCircuit: true
      };
    }
    return next(specifier, context);
  }
});
const { default: theme, color } = await import("#common/theme");

hooks.deregister();

const meta = () =>
  document.querySelector('meta[name="theme-color"]').getAttribute("content");

test("테마 적용 후 메타 색상을 갱신하고 이벤트·관찰자를 중복 등록하지 않는다", () => {
  for (const mode of ["light", "dark", "black", "light"]) {
    assert.equal(theme(mode), mode);
    assert.equal(document.documentElement.getAttribute("data-theme"), mode);
    assert.equal(meta(), values[mode]);
  }
  assert.equal(observers.length, 1);
  assert.equal(
    window.listeners.filter(({ type }) => type === "pageshow").length,
    1
  );

  assert.equal(
    document.listeners.filter(({ type }) => type === "visibilitychange").length,
    1
  );
  assert.equal(document.querySelectorAll('meta[name="theme-color"]').length, 1);
  assert.equal(document.querySelectorAll(".theme-color").length, 1);
});

test("시스템 테마 변화와 wearable 기본 black 선택을 유지한다", () => {
  theme("system");
  scheme.matches = true;
  scheme.dispatchEvent(new Event("change"));
  assert.equal(meta(), values.dark);
  theme("light");
  scheme.dispatchEvent(new Event("change"));
  assert.equal(meta(), values.light);
  document.documentElement.className = "wearable";
  assert.equal(theme(), "black");
  assert.equal(meta(), values.black);
  document.documentElement.className = "";
  assert.equal(theme("invalid"), "system");
});

test("뷰어 색상을 우선 적용하고 해제·연결 종료 시 문서 테마로 복원한다", () => {
  theme("light");
  const viewer = new Element();

  viewer.isConnected = true;
  viewer.background = "rgb(0, 0, 0)";
  const restore = color(viewer);

  assert.equal(meta(), values.black);
  const nested = color("rgb(12, 34, 56)");

  assert.equal(meta(), "rgb(12, 34, 56)");
  nested();
  assert.equal(meta(), values.black);
  viewer.isConnected = false;
  observers[0].callback();
  assert.equal(meta(), values.light);
  restore();
  assert.equal(meta(), values.light);
});
