import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

import * as route from "#shared/route";
import { state, database } from "./fixtures/pwa.js";

const fixture = JSON.stringify(
  new URL("./fixtures/pwa.js", import.meta.url).href
);

const sources = {
  "#common/dom": `export { has, on } from ${fixture};`,
  "#common/toast": `export { toast as default } from ${fixture};`
};

const hooks = registerHooks({
  resolve(specifier, context, next) {
    return sources[specifier]
      ? {
          url: `data:text/javascript,${encodeURIComponent(sources[specifier])}`,
          shortCircuit: true
        }
      : next(specifier, context);
  },
  load(url, context, next) {
    const result = next(url, context);

    if (
      url.endsWith("/src/js/pwa.js") ||
      url.endsWith("/src/js/common/push.js")
    ) {
      return {
        ...result,
        source: String(result.source).replaceAll(
          "import.meta.env.PROD",
          "globalThis.pwaProduction"
        )
      };
    }
    return result;
  }
});
const pwa = await import("#src/pwa");
const push = await import("#common/push");
const { default: sync } = await import("#common/sync");

hooks.deregister();

const browser = (t) => {
  const messages = [];
  const registrations = [];
  const notifications = [];
  const registration = {
    active: { postMessage: (data) => messages.push(data) },
    pushManager: { getSubscription: async () => null },
    showNotification: async (...args) => notifications.push(args)
  };

  const worker = Object.assign(new EventTarget(), {
    register: async (...args) => registrations.push(args),
    getRegistration: async () => registration,
    ready: Promise.resolve(registration)
  });

  const Notification = {
    permission: "granted",
    requestPermission: async () => {
      throw new Error("Unexpected permission prompt");
    }
  };

  const window = Object.assign(new EventTarget(), {
    Notification,
    PushManager: {}
  });

  const globals = {
    window,
    Notification,
    navigator: { serviceWorker: worker },
    document: { visibilityState: "visible" },
    matchMedia: () => ({ matches: true }),
    pwaProduction: true
  };

  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);

    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value
    });

    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else delete globalThis[key];
    });
  }
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected network request");
  });
  state.wearable = false;
  state.toasts.length = 0;
  return {
    ...globals,
    worker,
    registration,
    registrations,
    messages,
    notifications
  };
};

const queue = (t, failure) => {
  const db = database({ failure });
  const previous = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");

  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: db.indexedDB
  });

  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "indexedDB", previous);
    else delete globalThis.indexedDB;
  });

  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 503 })
  );
  return db;
};

for (const failure of [
  "open",
  "open-throw",
  "transaction",
  "store",
  "add",
  "error",
  "abort"
]) {
  test(
    `sync 큐 저장 ${failure} 실패는 거부하고 열린 연결을 한 번 정리한다`,
    { timeout: 1000 },
    async (t) => {
      const env = browser(t);
      const db = queue(t, failure);

      await assert.rejects(
        sync("/test", { method: "POST", data: { value: 1 } })
      );

      assert.equal(
        db.calls.filter(([type]) => type === "close").length,
        failure.startsWith("open") ? 0 : 1
      );
      assert.deepEqual(db.rows, []);
      assert.deepEqual(env.messages, []);
    }
  );
}

for (const failure of [
  "unsupported",
  "missing",
  "inactive",
  "lookup",
  "schedule",
  "message"
]) {
  test(
    `sync의 Worker ${failure} 상황에서도 저장한 큐를 유지하고 반환한다`,
    { timeout: 1000 },
    async (t) => {
      const env = browser(t);
      const db = queue(t);

      Object.defineProperty(env.worker, "ready", {
        get: () => {
          throw new Error("ready must not be used");
        }
      });
      if (failure === "unsupported") delete env.navigator.serviceWorker;
      if (failure === "missing")
        env.worker.getRegistration = async () => undefined;
      if (failure === "inactive") env.registration.active = null;
      if (failure === "lookup")
        env.worker.getRegistration = async () => {
          throw new Error("lookup failed");
        };
      if (failure === "schedule")
        env.registration.sync = {
          register: async () => {
            throw new Error("schedule failed");
          }
        };
      if (failure === "message")
        env.registration.active.postMessage = () => {
          throw new Error("message failed");
        };
      assert.equal(
        await sync("/test", { method: "POST", data: { value: 1 } }),
        null
      );
      assert.equal(db.rows.length, 1);
      if (failure === "schedule")
        assert.deepEqual(env.messages, [{ type: "sync" }]);
    }
  );
}

for (const failure of [
  "missing",
  "inactive",
  "lookup",
  "denied",
  "permission",
  "display"
]) {
  test(
    `notify는 ${failure} 상황에서 대기하지 않고 false를 반환한다`,
    { timeout: 1000 },
    async (t) => {
      const env = browser(t);

      Object.defineProperty(env.worker, "ready", {
        get: () => {
          throw new Error("ready must not be used");
        }
      });
      if (failure === "missing")
        env.worker.getRegistration = async () => undefined;
      if (failure === "inactive") env.registration.active = null;
      if (failure === "lookup")
        env.worker.getRegistration = async () => {
          throw new Error("lookup failed");
        };
      if (failure === "denied") env.Notification.permission = "denied";
      if (failure === "permission") env.Notification.permission = "default";
      if (failure === "display")
        env.registration.showNotification = async () => {
          throw new Error("display failed");
        };
      assert.equal(await push.notify("test"), false);
      assert.deepEqual(env.notifications, []);
    }
  );
}

test("개발 환경과 미지원 환경에서는 Worker·Push를 등록하지 않는다", async (t) => {
  const env = browser(t);

  globalThis.pwaProduction = false;
  assert.equal(await pwa.load(), undefined);
  assert.equal(await push.subscribe(env.registration), false);
  assert.deepEqual(env.registrations, []);
  delete env.window.PushManager;
  assert.equal(push.supported(env.registration), false);
});

test("Worker 등록 URL·설치 시 캐시·온라인 동기화·전면 알림 계약을 유지한다", async (t) => {
  const env = browser(t);

  assert.equal(await pwa.load(), env.registration);
  assert.deepEqual(env.registrations, [["/service-work.js", { scope: "/" }]]);
  assert.deepEqual(env.messages, [
    { type: "offline", locale: `/api${route.i18n}`, content: route.content }
  ]);
  env.window.dispatchEvent(new Event("online"));
  assert.deepEqual(env.messages.at(-1), { type: "sync" });
  env.window.dispatchEvent(new Event("appinstalled"));
  env.window.dispatchEvent(new Event("appinstalled"));
  assert.equal(env.messages.length, 3);
  const data = { title: "title", body: "body", image: "image", url: "/" };

  env.worker.dispatchEvent(
    Object.assign(new Event("message"), { data: { type: "notify", data } })
  );

  assert.deepEqual(state.toasts, [
    { type: "notify", title: "title", text: "body", image: "image", url: "/" }
  ]);
  env.document.visibilityState = "hidden";
  env.worker.dispatchEvent(
    Object.assign(new Event("message"), { data: { type: "notify", data } })
  );
  assert.equal(state.toasts.length, 1);
});

test("기존 구독 확인은 권한을 요청하지 않고 PUT으로 갱신한다", async (t) => {
  const env = browser(t);
  const subscription = { endpoint: "https://example.test/push" };

  env.registration.pushManager.getSubscription = async () => subscription;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, `/api${route.push}`);
    assert.equal(options.method, "PUT");
    assert.deepEqual(JSON.parse(options.body), { subscription });
    return new Response(null, { status: 204 });
  });
  assert.equal(await push.enabled(env.registration), true);
  env.Notification.permission = "denied";
  assert.equal(await push.enabled(env.registration), false);
});

test("알림 켜기는 권한 승인 후 키를 해석하고 구독을 POST한다", async (t) => {
  const env = browser(t);
  const subscription = { endpoint: "https://example.test/push" };
  const methods = [];

  let prompts = 0;

  env.Notification.permission = "default";
  env.Notification.requestPermission = async () => {
    prompts++;
    return (env.Notification.permission = "granted");
  };

  env.registration.pushManager.subscribe = async (options) => {
    assert.equal(options.userVisibleOnly, true);
    assert.deepEqual([...options.applicationServerKey], [1, 2, 3, 255]);
    return subscription;
  };

  t.mock.method(globalThis, "fetch", async (url, options) => {
    methods.push(options.method || "GET");
    if (options.method === "POST") {
      assert.deepEqual(JSON.parse(options.body), { subscription });
      return new Response(null, { status: 204 });
    }
    return Response.json({ key: "AQID_w" });
  });
  assert.equal(await push.default(true, env.registration), true);
  assert.equal(prompts, 1);
  assert.deepEqual(methods, ["GET", "POST"]);
});

test("wearable과 권한 거부 상태에서는 알림을 켜지 않는다", async (t) => {
  const env = browser(t);

  state.wearable = true;
  assert.equal(await push.default(true, env.registration), false);
  state.wearable = false;
  env.Notification.permission = "denied";
  assert.equal(await push.default(true, env.registration), false);
});

test("만료된 구독의 PUT 404 응답은 브라우저 구독을 해제한다", async (t) => {
  const env = browser(t);

  let removed = 0;

  env.registration.pushManager.getSubscription = async () => ({
    unsubscribe: async () => {
      removed++;
      return true;
    }
  });

  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 404 })
  );
  assert.equal(await push.active(env.registration), false);
  assert.equal(removed, 1);
});

test("알림 끄기는 endpoint를 DELETE하고 꺼진 상태를 반환한다", async (t) => {
  const env = browser(t);

  env.registration.pushManager.getSubscription = async () => ({
    endpoint: "https://example.test/push",
    unsubscribe: async () => true
  });

  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.method, "DELETE");
    assert.deepEqual(JSON.parse(options.body), {
      endpoint: "https://example.test/push"
    });
    return new Response(null, { status: 204 });
  });
  assert.equal(await push.default(false, env.registration), false);
});

test("사용 예정 notify·sync 공개 함수는 유지한다", async (t) => {
  const env = browser(t);

  assert.equal(pwa.notify, push.notify);
  assert.equal(pwa.sync, sync);
  assert.equal(await pwa.notify("title", { body: "body" }), true);
  assert.deepEqual(env.notifications, [
    ["title", { icon: "/icons/icon-192.png", body: "body" }]
  ]);
});

for (const status of [200, 400]) {
  test(`sync는 ${status} 응답을 큐에 넣지 않는다`, async (t) => {
    browser(t);
    t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(null, { status })
    );
    assert.equal((await sync("/test")).status, status);
  });
}

for (const fallback of [false, true]) {
  test(`sync 실패 시 기존 IndexedDB 큐와 ${fallback ? "메시지" : "Background Sync"}를 사용한다`, async (t) => {
    const env = browser(t);
    const db = database();
    const previous = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
    const tags = [];

    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: db.indexedDB
    });

    t.after(() => {
      if (previous) Object.defineProperty(globalThis, "indexedDB", previous);
      else delete globalThis.indexedDB;
    });
    if (!fallback)
      env.registration.sync = { register: async (tag) => tags.push(tag) };
    t.mock.method(globalThis, "fetch", async () => {
      if (fallback) throw new TypeError("offline");
      return new Response(null, { status: 503 });
    });

    assert.equal(
      await sync("/test", { method: "POST", data: { value: 1 } }),
      null
    );
    assert.deepEqual(db.calls[0], ["open", "sync", 1]);
    assert.deepEqual(db.calls[1], [
      "create",
      "requests",
      { keyPath: "id", autoIncrement: true }
    ]);

    assert.deepEqual(db.rows, [
      {
        id: 1,
        url: "/api/test",
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: '{"value":1}'
        }
      }
    ]);
    assert.equal(db.calls.at(-1)[0], "close");
    if (fallback) assert.deepEqual(env.messages, [{ type: "sync" }]);
    else assert.deepEqual(tags, ["api-sync"]);
  });
}
