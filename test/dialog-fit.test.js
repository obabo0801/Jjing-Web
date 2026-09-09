import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

import { Element, document, window } from "./fixtures/mount.js";

const frames = new Map();

let id = 0;

const globals = {
  document,
  window,
  requestAnimationFrame: (callback) => {
    frames.set(++id, callback);
    return id;
  },
  cancelAnimationFrame: (frame) => frames.delete(frame)
};

const saved = Object.fromEntries(
  Object.keys(globals).map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key)
  ])
);

for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, value });
}
after(() => {
  for (const [key, descriptor] of Object.entries(saved)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier !== "#common/css") return next(specifier, context);
    return {
      url: `data:text/javascript,${encodeURIComponent(`
        export const set = (element, values) => {
          element.writes.push(values);
          for (const [key, value] of Object.entries(values)) {
            if (value === null) delete element.rules[key];
            else element.rules[key] = value;
          }
        };
      `)}`,
      shortCircuit: true
    };
  }
});
const { default: fit } = await import("#common/dialog/fit");

hooks.deregister();

const flush = () => {
  const callbacks = [...frames.values()];

  frames.clear();
  callbacks.forEach((callback) => callback());
};

const setup = () => {
  const element = new Element("dialog");
  const input = new Element("input", ["textarea, input"]);
  const view = new EventTarget();

  frames.clear();
  document.documentElement.className = "mobile";
  document.documentElement.clientHeight = 800;
  window.innerHeight = 800;
  Object.assign(view, { scale: 1, height: 750, offsetTop: 0 });
  window.visualViewport = view;
  element.open = true;
  element.contains = (target) => element.children.includes(target);
  element.rules = { "--unrelated": "keep" };
  element.writes = [];
  input.type = "text";
  element.append(input);
  document.activeElement = input;

  return {
    element,
    input,
    view,
    resize: (values) => {
      Object.assign(view, values);
      view.dispatchEvent(new Event("resize"));
      flush();
    }
  };
};

test("주소창 변화는 무시하고 키보드가 줄인 높이·상단 위치만 dialog에 전달한다", (t) => {
  const { element, resize } = setup();

  t.after(fit(element));
  flush();
  assert.equal(element.writes.length, 0);
  resize({ height: 430, offsetTop: 20 });
  assert.deepEqual(element.rules, {
    "--unrelated": "keep",
    "--dialog-top": "20px",
    "--dialog-height": "430px"
  });
  assert.equal(element.getAttribute("data-keyboard"), "");
  assert.equal(element.getAttribute("style"), null);
});

test("키보드를 닫으면 원래 배치로 복원하고 다른 공용 CSS 값은 보존한다", (t) => {
  const { element, resize } = setup();

  t.after(fit(element));
  resize({ height: 400 });
  resize({ height: 750 });
  assert.equal(element.getAttribute("data-keyboard"), null);
  assert.deepEqual(element.rules, { "--unrelated": "keep" });
});

test("pinch zoom 중에는 기존 위치를 유지하며 확대를 키보드로 판정하지 않는다", (t) => {
  const { element, resize } = setup();

  t.after(fit(element));
  resize({ height: 300, scale: 2, offsetTop: 80 });
  assert.equal(element.writes.length, 0);
  resize({ height: 430, scale: 1, offsetTop: 0 });
  const before = { ...element.rules };

  resize({ height: 215, scale: 2, offsetTop: 120 });
  assert.deepEqual(element.rules, before);
  resize({ height: 750, scale: 1, offsetTop: 0 });
  assert.equal(element.getAttribute("data-keyboard"), null);
});

test("레이아웃 자체가 키보드에 맞춰 줄어든 경우 이중 보정하지 않는다", (t) => {
  const { element, resize } = setup();

  t.after(fit(element));
  window.innerHeight = document.documentElement.clientHeight = 400;
  resize({ height: 400 });
  assert.equal(element.writes.length, 0);
});

test("키보드 입력이 아닌 요소·읽기 전용·비활성 입력에는 적용하지 않는다", () => {
  for (const properties of [
    { type: "checkbox" },
    { type: "file" },
    { type: "range" },
    { readOnly: true },
    { disabled: true },
    { inputMode: "none" }
  ]) {
    const { element, input, resize } = setup();

    Object.assign(input, properties);
    const stop = fit(element);

    try {
      resize({ height: 400 });
      assert.equal(element.writes.length, 0);
    } finally {
      stop();
    }
  }
});

test("textarea와 숫자·이메일 입력에도 적용한다", () => {
  for (const type of ["textarea", "number", "email"]) {
    const { element, input, resize } = setup();

    input.type = type;
    if (type === "textarea") input.tag = "textarea";
    const stop = fit(element);

    try {
      resize({ height: 400 });
      assert.equal(element.getAttribute("data-keyboard"), "");
    } finally {
      stop();
    }
  }
});

test("dialog 내부 확인 버튼으로 포커스 이동 시 유지하고 외부 이동 시 해제한다", (t) => {
  const { element, resize } = setup();
  const button = new Element("button");

  element.append(button);
  t.after(fit(element));
  resize({ height: 400 });
  document.activeElement = button;
  element.dispatchEvent(new Event("focusout"));
  flush();
  assert.equal(element.getAttribute("data-keyboard"), "");
  document.activeElement = new Element("input");
  element.dispatchEvent(new Event("focusout"));
  flush();
  assert.equal(element.getAttribute("data-keyboard"), null);
});

test("이벤트는 프레임당 한 번 처리하고 닫을 때 예약·리스너를 정리한다", () => {
  const { element, view } = setup();
  const stop = fit(element);

  view.height = 400;
  for (let index = 0; index < 20; index++)
    view.dispatchEvent(new Event("resize"));
  assert.equal(frames.size, 1);
  flush();
  assert.equal(element.writes.length, 1);
  view.dispatchEvent(new Event("scroll"));
  flush();
  assert.equal(element.writes.length, 1);
  view.dispatchEvent(new Event("resize"));
  stop();
  assert.equal(frames.size, 0);
  view.dispatchEvent(new Event("resize"));
  element.dispatchEvent(new Event("focusin"));
  window.dispatchEvent(new Event("resize"));
  assert.equal(frames.size, 0);
  assert.equal(element.getAttribute("data-keyboard"), ""); // 닫기 애니메이션 유지
});

test("데스크탑·wearable·전체 화면·VisualViewport 미지원에는 관여하지 않는다", () => {
  for (const mode of ["desktop", "wearable", "fullscreen", "unsupported"]) {
    const { element } = setup();

    if (mode === "desktop") document.documentElement.className = "";
    if (mode === "wearable")
      document.documentElement.className = "mobile wearable";
    if (mode === "fullscreen") element.setAttribute("data-fullscreen", "");
    if (mode === "unsupported") window.visualViewport = undefined;
    fit(element)();
    assert.equal(frames.size, 0);
  }
});

test("선택 방지는 채팅 시간·본문에만 선언하고 dialog 높이는 CSS로 제한한다", async () => {
  const chat = await readFile(
    new URL("../src/css/common/chatting.css", import.meta.url),
    "utf8"
  );

  const dialog = await readFile(
    new URL("../src/css/common/dialog.css", import.meta.url),
    "utf8"
  );

  assert.match(
    chat,
    /\.chatting-time,\s*\.chatting-text\s*\{\s*-webkit-user-select: none;\s*user-select: none;/
  );
  assert.doesNotMatch(chat, /\.chatting-input\s*\{[^}]*user-select:\s*none/);
  assert.match(dialog, /\.mobile dialog\[data-dialog\]\[data-keyboard\]/);
  assert.ok(dialog.includes("calc(var(--dialog-height) - 2rem)"));
});
