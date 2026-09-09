import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

import { Element, document, window } from "./fixtures/mount.js";

// 실제 layer의 생성/이벤트/종료 코드를 실행하고 브라우저 DOM만 대체합니다.
const create = (tag) => {
  const element = new Element(tag);
  const matches = element.matches.bind(element);

  element.type = tag === "input" ? "text" : "";
  element.matches = (selector) =>
    selector === ":disabled" ? !!element.disabled : matches(selector);
  element.getClientRects = () => (element.hidden ? [] : [{}]);
  element.focus = () => {
    document.activeElement = element;
  };

  element.showModal = () => {
    element.open = true;
  };

  element.close = () => {
    element.open = false;
  };

  Object.defineProperty(element, "form", {
    get: () => {
      const id = element.getAttribute("form");

      return id
        ? document.querySelectorAll("form").find((form) => form.id === id)
        : element.parent?.closest("form");
    }
  });

  element.click = () => {
    if (element.disabled) return;

    const event = new Event("click", { cancelable: true });

    element.dispatchEvent(event);
    if (!event.defaultPrevented && element.type === "submit") {
      element.form?.dispatchEvent(new Event("submit", { cancelable: true }));
    }
  };
  return element;
};

document.createElement = create;
window.getSelection = () => null;

const globals = {
  document,
  window,
  Node: Element,
  Element,
  HTMLElement: Element,
  matchMedia: () => ({ matches: true }),
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {}
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

const modules = {
  "#common/css": "export const set = () => {}; export const remove = () => {};",
  "#common/back":
    "export const add = () => () => {}; export const back = async () => {};",
  "#common/i18n": "export const translate = async () => true;",
  "#common/overlay": `export default () => {
    const release = async () => {};
    release.open = release.strength = () => {};
    return release;
  };`,
  "#common/swipe":
    "export default () => () => {}; export const resolve = () => {};",
  "#common/button": "export const trigger = null;"
};

for (const name of [
  "mount",
  "sheet/snap",
  "vibrate",
  "viewport",
  "dialog/fit"
]) {
  modules[`#common/${name}`] = "export default () => () => {};";
}

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (!modules[specifier]) return next(specifier, context);
    return {
      url: `data:text/javascript,${encodeURIComponent(modules[specifier])}`,
      shortCircuit: true
    };
  }
});
const { default: layer } = await import("#common/layer");

hooks.deregister();

const flush = () => new Promise(setImmediate);
const open = async (context, action = {}, fields = [create("input")]) => {
  const content = create("div");
  const ready = Promise.withResolvers();

  document.activeElement = null;
  content.append(...fields);

  const pending = layer("dialog", {
    content,
    actions: [
      { text: "cancel", value: false },
      { text: "confirm", value: true, submit: true, ...action }
    ],
    ready: (element, close) => ready.resolve({ element, close })
  });
  const { element, close } = await ready.promise;
  const form = content.parent;
  const buttons = element.querySelectorAll("button");

  context.after(async () => {
    await close(false);
    await pending;
  });
  return { form, buttons, fields, pending, close };
};

const key = (form, target, values = {}) => {
  const event = new Event("keydown", { cancelable: true });

  Object.defineProperty(event, "target", { value: target });
  Object.assign(event, { key: "Enter", ...values });
  form.dispatchEvent(event);
  return event;
};

test("Enter와 모바일 submit은 지정된 확인 버튼과 같은 결과로 닫는다", async (context) => {
  for (const method of ["enter", "submit", "click"]) {
    let calls = 0;

    const view = await open(context, {
      run: () => {
        calls += 1;
      }
    });

    assert.equal(view.form.tag, "form");
    assert.equal(view.form.noValidate, true);
    assert.equal(view.buttons[0].type, "button");
    assert.equal(view.buttons[1].form, view.form);
    if (method === "enter") key(view.form, view.fields[0]);
    else if (method === "submit")
      view.form.dispatchEvent(new Event("submit", { cancelable: true }));
    else view.buttons[1].click();
    assert.equal(await view.pending, true);
    assert.equal(calls, 1);
  }
});

test("submit 지정이 없으면 기존 div와 일반 버튼을 유지한다", async (context) => {
  const view = await open(context, { submit: false });

  assert.equal(view.form.tag, "div");
  assert.equal(view.buttons[1].type, "button");
  assert.equal(key(view.form, view.fields[0]).defaultPrevented, false);
  view.buttons[0].click();
  assert.equal(await view.pending, false);
});

test("비활성 확인과 최신 검증 실패는 Enter와 submit으로 실행되지 않는다", async (context) => {
  let disabled = true;
  let calls = 0;

  const view = await open(context, {
    disabled: () => disabled,
    run: () => {
      calls += 1;
    }
  });

  key(view.form, view.fields[0]);
  view.form.dispatchEvent(new Event("submit", { cancelable: true }));
  assert.equal(calls, 0);
  view.buttons[1].disabled = false;
  key(view.form, view.fields[0]);
  assert.equal(calls, 0);
  disabled = false;
  key(view.form, view.fields[0]);
  assert.equal(await view.pending, true);
  assert.equal(calls, 1);
});

test("제출 처리 중 클릭/Enter/submit이 겹쳐도 한 번만 실행한다", async (context) => {
  const result = Promise.withResolvers();

  let calls = 0;

  const view = await open(context, {
    run: () => {
      calls += 1;
      return result.promise;
    }
  });

  key(view.form, view.fields[0]);
  view.buttons[1].click();
  key(view.form, view.fields[0]);
  view.form.dispatchEvent(new Event("submit", { cancelable: true }));
  assert.equal(calls, 1);
  result.resolve();
  assert.equal(await view.pending, true);
  view.buttons[1].click();
  assert.equal(calls, 1);
});

test("검증 실패로 false를 반환하거나 close:false이면 열린 상태에서 재시도한다", async (context) => {
  for (const action of [{ run: () => false }, { close: false }]) {
    const view = await open(context, action);

    key(view.form, view.fields[0]);
    await flush();
    assert.equal(view.form.parent.open, true);
    view.buttons[0].click();
    assert.equal(await view.pending, false);
  }
});

test("한글 조합 중 Enter/submit과 반복 Enter는 제출하지 않는다", async (context) => {
  let calls = 0;

  const view = await open(context, {
    run: () => {
      calls += 1;
    }
  });

  view.form.dispatchEvent(new Event("compositionstart"));
  key(view.form, view.fields[0]);
  view.form.dispatchEvent(new Event("submit", { cancelable: true }));
  view.form.dispatchEvent(new Event("compositionend"));
  for (const values of [
    { isComposing: true },
    { keyCode: 229 },
    { repeat: true },
    { shiftKey: true }
  ]) {
    assert.equal(key(view.form, view.fields[0], values).defaultPrevented, true);
  }
  assert.equal(calls, 0);
  key(view.form, view.fields[0]);
  assert.equal(await view.pending, true);
});

test("다음 키는 숨김/비활성/읽기전용/체크박스를 건너뛰고 다음 입력에 포커스한다", async (context) => {
  const fields = Array.from({ length: 6 }, () => create("input"));

  fields[0].enterKeyHint = "next";
  fields[1].hidden = true;
  fields[2].disabled = true;
  fields[3].readOnly = true;
  fields[4].type = "checkbox";
  fields[5].type = "email";

  const view = await open(context, {}, fields);

  key(view.form, fields[0]);
  assert.equal(document.activeElement, fields[5]);
  assert.equal(view.form.parent.open, true);
  key(view.form, fields[5]);
  assert.equal(await view.pending, true);
});

test("textarea 줄바꿈과 다른 form의 입력, 체크박스 Enter를 가로채지 않는다", async (context) => {
  const area = create("textarea");
  const checkbox = create("input");
  const foreign = create("input");

  checkbox.type = "checkbox";

  const view = await open(context, {}, [area, checkbox]);

  for (const input of [area, checkbox, foreign]) {
    assert.equal(key(view.form, input).defaultPrevented, false);
  }
  assert.equal(view.form.parent.open, true);
});

test("닫힌 layer는 제출 이벤트를 해제한다", async (context) => {
  const view = await open(context);

  await view.close(false);
  assert.equal(key(view.form, view.fields[0]).defaultPrevented, false);
});
