import assert from "node:assert/strict";
import { once } from "node:events";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import express from "express";
import * as fixture from "./fixtures/i18n.js";
import { content, i18n as route } from "#shared/route";

const url = new URL("./fixtures/i18n.js", import.meta.url).href;
const modules = {
  "#service/locale": `export {langs, locale} from '${url}';`,
  "#common/dom": `export {root,all,get,query} from '${url}';`,
  "#common/api": `export {api as default} from '${url}';`,
  "#common/storage": `export {stored as get,save as set} from '${url}';`
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
const { default: router } = await import("#router/i18n");
const app = express();

app.use(express.json());
app.use(route, router);

let server;
let count = 0;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  fixture.state.base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  hooks.deregister();
  await new Promise((resolve) => server.close(resolve));
});

const fresh = async () => {
  fixture.elements.length = 0;
  fixture.state.requests.length = 0;
  fixture.state.hook = null;
  fixture.storage.clear();
  fixture.root.lang = "before";
  return import(
    new URL(`../src/js/common/i18n.js?test=${++count}`, import.meta.url)
  );
};

const deferred = () => {
  let resolve;

  const promise = new Promise((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

test("키가 없으면 번역 요청을 보내지 않는다", async () => {
  const client = await fresh();

  assert.equal(await client.translate(), true);
  assert.equal(fixture.state.requests.length, 0);
});

for (const size of [256, 257, 513]) {
  test(`실제 사전에 존재하는 ${size}개 키를 256개씩 요청해 전부 적용한다`, async () => {
    const client = await fresh();
    const names = fixture.names.slice(0, size);
    const targets = names.map((name) => fixture.element(name));

    assert.equal(new Set(Object.values(fixture.locale("ko"))).size, 600);
    client.preload(...names, ...names); // DOM·preload에 겹치는 키도 한 번씩만 요청합니다.
    assert.equal(await client.translate("system"), true);
    assert.deepEqual(
      fixture.state.requests.map(({ keys }) => keys.length),
      size === 256 ? [256] : size === 257 ? [256, 1] : [256, 256, 1]
    );

    assert.equal(
      new Set(fixture.state.requests.flatMap(({ keys }) => keys)).size,
      size
    );
    assert.equal(fixture.root.lang, "ko");
    names.forEach((name, index) => {
      assert.equal(client.message(name), fixture.locale("ko")[name]);
      assert.equal(targets[index].textContent, fixture.locale("ko")[name]);
    });

    assert.ok(
      fixture.state.requests.every(
        ({ path, lang }) => path === route && lang === "system"
      )
    );
  });
}

test("서버는 유효한 257개 키도 직접 단일 요청하면 256개까지만 처리한다", async () => {
  await fresh();
  const keys = await Promise.all(
    fixture.names.slice(0, 257).map(async (name) =>
      Buffer.from(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name))
      )
        .toString("hex")
        .slice(0, 8)
    )
  );

  const result = await fixture.api(route, {
    method: "POST",
    data: { [content]: fixture.encode({ lang: "ko", keys }) }
  });

  assert.equal(
    Object.keys(fixture.decode(result.data[content]).text).length,
    256
  );
});

const failures = {
  http: async () => ({ ok: false }),
  network: async () => {
    throw new Error("offline");
  },
  envelope: async () => ({ ok: true, data: { [content]: 5 } }),
  encoding: async () => ({ ok: true, data: { [content]: "not base64" } }),
  lang: async () => ({
    ok: true,
    data: { [content]: fixture.encode({ lang: 7, text: {} }) }
  }),
  text: async () => ({
    ok: true,
    data: { [content]: fixture.encode({ lang: "en", text: [] }) }
  }),
  value: async () => ({
    ok: true,
    data: { [content]: fixture.encode({ lang: "en", text: { key: 4 } }) }
  }),
  mixed: async (_, send) => {
    const result = await send();
    const value = fixture.decode(result.data[content]);

    value.lang = "ko";
    return { ok: true, data: { [content]: fixture.encode(value) } };
  }
};

for (const [name, fail] of Object.entries(failures)) {
  test(`두 번째 요청 ${name} 실패 시 기존 messages·문서 언어·DOM을 보존한다`, async () => {
    const client = await fresh();
    const targets = fixture.names
      .slice(0, 257)
      .map((key) => fixture.element(key));

    assert.equal(await client.translate("ko"), true);
    fixture.state.requests.length = 0;
    fixture.state.hook = (request, send) =>
      fixture.state.requests.length === 2 ? fail(request, send) : send();
    assert.equal(await client.translate("en"), false);
    assert.equal(fixture.root.lang, "ko");
    targets.forEach((target, index) => {
      assert.equal(
        target.textContent,
        fixture.locale("ko")[fixture.names[index]]
      );
      assert.equal(client.message(fixture.names[index]), target.textContent);
    });
  });
}

test(
  "마지막 응답까지 받기 전에는 일부 번역도 적용하지 않는다",
  { timeout: 5000 },
  async () => {
    const client = await fresh();
    const target = fixture.element(fixture.names[0]);
    const arrived = deferred();
    const release = deferred();

    client.preload(...fixture.names.slice(0, 513));
    fixture.state.hook = async (_, send) => {
      if (fixture.state.requests.length === 3) {
        arrived.resolve();
        await release.promise;
      }
      return send();
    };
    const done = client.translate("en");

    await arrived.promise;
    assert.equal(target.textContent, "before");
    assert.equal(client.message(fixture.names[0]), "");
    assert.equal(fixture.root.lang, "before");
    release.resolve();
    assert.equal(await done, true);
    assert.equal(target.textContent, fixture.locale("en")[fixture.names[0]]);
  }
);

test("등록 속성·아이콘·없는 키의 기존 표시와 decode를 유지한다", async () => {
  const client = await fresh();
  const target = fixture.element(fixture.names[0]);
  const icon = { className: "icon" };
  const placeholder = fixture.element(
    fixture.names[1],
    "data-i18n-placeholder"
  );
  const missing = fixture.element("missing.key");

  target.children.push(icon);
  const remove = client.register("data-i18n-placeholder", (element, value) => {
    element.placeholder = value;
  });

  client.preload(...fixture.names.slice(0, 257), "missing.key");
  assert.equal(await client.translate("ko"), true);
  assert.equal(fixture.state.requests.length, 2);
  assert.equal(target.children[0], icon);
  assert.equal(target.textContent, fixture.locale("ko")[fixture.names[0]]);
  assert.equal(placeholder.placeholder, fixture.locale("ko")[fixture.names[1]]);
  assert.equal(missing.textContent, "before");
  assert.equal(client.message("missing.key"), "");
  assert.deepEqual(client.decode(fixture.encode({ text: "한국어" })), {
    text: "한국어"
  });
  remove();
});

for (const latestFails of [false, true]) {
  test(
    `이전 언어의 늦은 응답은 덮어쓰지 않고 최신 작업의 결과(${latestFails ? "실패" : "성공"})를 반환한다`,
    { timeout: 5000 },
    async () => {
      const client = await fresh();
      const target = fixture.element(fixture.names[0]);
      const arrived = deferred();
      const release = deferred();

      fixture.state.hook = async (request, send) => {
        if (request.lang === "ko") {
          arrived.resolve();
          await release.promise;
        }
        if (request.lang === "en" && latestFails) return { ok: false };
        return send();
      };
      const old = client.translate("ko");

      await arrived.promise;
      assert.equal(await client.translate("en"), !latestFails);
      release.resolve();
      assert.equal(await old, !latestFails);
      assert.equal(
        target.textContent,
        latestFails ? "before" : fixture.locale("en")[fixture.names[0]]
      );
      assert.equal(fixture.root.lang, latestFails ? "before" : "en");
      assert.equal(fixture.storage.get("lang"), "en");
    }
  );
}

test(
  "동일 언어로 겹친 레이어 번역도 취소로 오인하지 않고 최신 DOM까지 준비한다",
  { timeout: 5000 },
  async () => {
    const client = await fresh();
    const target = fixture.element(fixture.names[0]);
    const arrived = deferred();
    const release = deferred();

    fixture.state.hook = async (_, send) => {
      if (fixture.state.requests.length === 1) {
        arrived.resolve();
        await release.promise;
      }
      return send();
    };
    const first = client.translate("ko");

    await arrived.promise;
    const added = fixture.element(fixture.names[1]);

    assert.equal(await client.translate("ko"), true);
    release.resolve();
    assert.equal(await first, true);
    assert.equal(target.textContent, fixture.locale("ko")[fixture.names[0]]);
    assert.equal(added.textContent, fixture.locale("ko")[fixture.names[1]]);
  }
);
