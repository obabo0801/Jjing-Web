import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { beforeEach, test } from "node:test";

import { create, query, reset, state } from "./fixtures/profile-view.js";

const fixture = JSON.stringify(
  new URL("./fixtures/profile-view.js", import.meta.url).href
);

const modules = {
  "#common/dom": `export { root, create, query, get, set, remove, on } from ${fixture}`,
  "#common/profile": `export { read, bind, block, unblock } from ${fixture}`,
  "#common/i18n": `export { preload, message, translate } from ${fixture}`,
  "#common/image/view": `export { viewer as default } from ${fixture}`,
  "#common/profile/authority": `export { authority as default } from ${fixture}`
};

for (const name of ["popover", "dialog", "drawer", "avatar", "mount"]) {
  modules[`#common/${name}`] = `export { ${name} as default } from ${fixture}`;
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

const { default: view } = await import("#common/profile/view");

hooks.deregister();
beforeEach(reset);

const flush = () => new Promise(setImmediate);
const click = (element) => element.dispatchEvent(new Event("click"));
const text = (root, key) => query(`[data-i18n="${key}"]`, root);
const button = (root, key) => text(root, key)?.parent;
const details = () => {
  state.user.manage = true;
  state.user.details = {
    uid: state.user.uid,
    email: "mail@example.com",
    date: "2026-09-08 12:34:56",
    userIp: "initial-ip",
    last: "2026-09-08 13:45:56",
    accessIp: "current-ip",
    os: "test-os",
    browser: "test-browser",
    lang: "ko-KR"
  };
};

const open = async (context, options = {}) => {
  const anchor = create("button");
  const target = create("div");
  const settings = {
    uid: state.user?.uid || "fallback",
    context: "chatting",
    ...options
  };
  const pending = view(anchor, target, settings);

  await flush();
  const layer = state.popovers.at(-1);

  assert.ok(layer);
  context.after(async () => {
    state.dialogs.forEach(({ resolve }) => resolve(false));
    layer.resolve(false);
    await pending;
    await flush();
  });
  return { anchor, target, settings, pending, layer, root: layer.content };
};

test("프로필을 최신 정보로 읽고 원본 이미지 뷰어의 anchor와 back을 유지한다", async (context) => {
  const { root, layer, anchor } = await open(context);

  assert.deepEqual(state.reads[0], {
    uid: state.user.uid,
    options: { fresh: true }
  });
  assert.equal(layer.anchor, anchor);
  assert.equal(layer.back, true);
  assert.equal(layer.direction, "←");
  assert.equal(query(".profile-name", root).textContent, "nickname");
  assert.equal(query(".profile-uid", root).textContent, "user-123");
  assert.equal(query(".profile-last", root).textContent, "profile.active");
  click(state.avatars[0].root);
  await flush();
  assert.deepEqual(state.viewers[0], [
    "/original",
    state.avatars[0].root,
    "user"
  ]);
});

test("같은 사용자 프로필을 연달아 열면 요청과 popover를 중복 생성하지 않는다", async (context) => {
  const { anchor, target, settings } = await open(context);

  assert.equal(await view(anchor, target, settings), false);
  assert.equal(state.reads.length, 1);
  assert.equal(state.popovers.length, 1);
});

test("조회 실패 시 전달받은 프로필을 사용하고 관리 버튼을 만들지 않는다", async (context) => {
  state.user = null;
  const { root } = await open(context, {
    name: "fallback-name",
    avatar: "/fallback"
  });

  assert.equal(query(".profile-name", root).textContent, "fallback-name");
  assert.equal(state.avatars[0].source, "/fallback");
  assert.equal(text(root, "profile.block"), null);
  assert.equal(state.authorities.length, 0);
});

test("본인 프로필은 me로 조회하고 채팅 상대 전용 메뉴를 숨긴다", async (context) => {
  state.user.self = true;
  const { root } = await open(context, { own: true });

  assert.equal(state.reads[0].uid, "me");
  assert.equal(text(root, "profile.message"), null);
  assert.equal(text(root, "profile.hide"), null);
  assert.equal(
    button(root, "profile.gift").getAttribute("data-background"),
    null
  );
  assert.equal(button(root, "profile.gift").getAttribute("data-response"), "");
  click(button(root, "profile.gift"));
  assert.equal(state.drawers[0].title, "profile.gift");
  assert.equal(state.drawers[0].back, true);
});

test("관리 정보는 권한·값이 있을 때만 표시하고 UID 축약·날짜 서식을 유지한다", async (context) => {
  details();
  state.user.details.email = "";
  state.user.authority = { enabled: false };
  const { root } = await open(context);
  const uid = text(root, "profile.uid").parent;
  const date = text(root, "profile.date").parent;

  assert.equal(query(".label-value", uid).textContent, "user-123…7890");
  assert.equal(query(".label-value", date).textContent, "2026-09-08 12:34");
  assert.equal(text(root, "profile.email"), null);
  assert.equal(root.querySelectorAll(".line").length, 2);
  assert.equal(state.authorities[0], state.user);
  assert.ok(button(root, "profile.chatMute"));
  assert.ok(button(root, "profile.kick"));
});

test("권한 없는 사용자는 details가 전달돼도 관리 UI를 만들지 않는다", async (context) => {
  details();
  state.user.manage = false;
  const { root } = await open(context);

  assert.equal(text(root, "profile.uid"), null);
  assert.equal(text(root, "profile.block"), null);
});

test("차단 사용자는 적색 상태·차단 정보·해제 버튼을 표시한다", async (context) => {
  details();
  state.user.blocked = true;
  state.user.block = {
    reason: "reason",
    time: "2026-09-08 12:00",
    actor: "actor"
  };
  const { root } = await open(context);

  assert.equal(query(".profile-last", root).getAttribute("data-blocked"), "");
  assert.equal(query(".profile-last", root).textContent, "profile.blocked");
  assert.equal(text(root, "profile.chatMute"), null);
  assert.equal(text(root, "profile.kick"), null);
  assert.ok(text(root, "profile.blockReason"));
  assert.ok(query(".profile-block", root));
  assert.equal(
    button(root, "profile.unblock").parent.getAttribute("data-danger"),
    ""
  );
});

test("상태 갱신은 관리 UI를 유지하고 권한·차단 변경 때만 교체하거나 제거한다", async (context) => {
  details();
  const { root } = await open(context);
  const render = state.bindings[0].render;
  const before = text(root, "profile.uid");

  render({ state: "offline", last: "invalid" });
  assert.equal(text(root, "profile.uid"), before);
  assert.equal(state.mounts.length, 0);
  assert.equal(query("[data-whisper]", root).hidden, true);
  render({ blocked: true, block: { reason: "changed" } });
  assert.notEqual(text(root, "profile.uid"), before);
  assert.equal(state.mounts.length, 1);
  assert.equal(state.translations, 1);
  assert.ok(button(root, "profile.unblock"));
  render({ manage: false, details: null, blocked: false, state: "online" });
  assert.equal(text(root, "profile.uid"), null);
  assert.equal(query("[data-whisper]", root).hidden, false);
  assert.equal(query(".profile-last", root).getAttribute("data-blocked"), null);
});

test("채팅 금지·퇴장·숨기기는 기존 이벤트와 전달값을 유지한다", async (context) => {
  details();
  const { root, target, settings } = await open(context);
  const events = [];

  for (const type of ["chatting-mute", "chatting-kick", "chatting-hide"]) {
    target.addEventListener(type, (event) =>
      events.push({ type, detail: event.detail })
    );
  }
  click(button(root, "profile.chatMute"));
  click(button(root, "profile.kick"));
  const input = root
    .querySelectorAll("input")
    .find(({ name }) => name === "chatting-hide");

  input.checked = true;
  input.dispatchEvent(new Event("change"));
  assert.deepEqual(events, [
    { type: "chatting-mute", detail: settings },
    { type: "chatting-kick", detail: settings },
    { type: "chatting-hide", detail: { ...settings, hidden: true } }
  ]);
});

for (const action of ["message", "whisper", "report"]) {
  test(`채팅 ${action}은 레이어가 해당 작업으로 닫힌 뒤 실행한다`, async (context) => {
    const { root, target, layer, pending, settings } = await open(context);
    const events = [];

    target.addEventListener(`chatting-${action}`, (event) =>
      events.push(event.detail)
    );

    assert.equal(
      button(root, `profile.${action}`).getAttribute("data-layer-action"),
      `profile.${action}`
    );
    assert.equal(events.length, 0);
    layer.resolve(`profile.${action}`);
    await pending;
    assert.deepEqual(events, [settings]);
  });
}

for (const blocked of [false, true]) {
  test(`차단 ${blocked ? "해제" : "처리"}는 중복 창을 막고 사유를 전달한 뒤 새로 조회한다`, async (context) => {
    details();
    state.user.blocked = blocked;
    const { root } = await open(context);
    const key = blocked ? "profile.unblock" : "profile.block";

    click(button(root, key));
    click(button(root, key));
    await flush();
    state.bindings[0].render({
      details: { ...state.user.details, email: "changed@example.com" }
    });
    click(button(root, key));
    await flush();
    assert.equal(state.dialogs.length, 1);
    const dialog = state.dialogs[0];
    const input = query("input", dialog.content);

    assert.equal(dialog.locked, true);
    assert.equal(input.enterKeyHint, "done");
    assert.equal(dialog.actions[1].submit, true);
    assert.notEqual(dialog.actions[0].submit, true);
    assert.equal(input.maxLength, 500);
    assert.equal(
      input.getAttribute("data-i18n-placeholder"),
      blocked ? "profile.unblockReason" : "profile.blockReason"
    );
    assert.equal(dialog.actions[1].disabled(), true);
    input.value = " reason ";
    assert.equal(dialog.actions[1].disabled(), false);
    dialog.resolve(true);
    await flush();
    assert.deepEqual(state.changes, [
      { type: blocked ? "unblock" : "block", args: [state.user.uid, "reason"] }
    ]);
    assert.equal(state.reads.length, 2);
    assert.deepEqual(state.reads[1], {
      uid: state.user.uid,
      options: { fresh: true }
    });
  });
}

test("차단 취소는 요청하지 않고 저장 실패는 오류 창만 표시한다", async (context) => {
  details();
  const { root } = await open(context);

  click(button(root, "profile.block"));
  state.dialogs[0].resolve(false);
  await flush();
  assert.equal(state.changes.length, 0);
  click(button(root, "profile.block"));
  state.result = { ok: false };
  query("input", state.dialogs[1].content).value = "reason";
  state.dialogs[1].resolve(true);
  await flush();
  assert.equal(state.dialogs[2].title, "profile.saveError");
  assert.equal(state.reads.length, 1);
});
