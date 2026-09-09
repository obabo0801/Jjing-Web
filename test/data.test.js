import assert from "node:assert/strict";
import { test } from "node:test";

import { clearData } from "#common/data";
import { database } from "./fixtures/pwa.js";

const storage = (t, failure) => {
  const db = database({ failure });
  const calls = [];
  const globals = {
    indexedDB: db.indexedDB,
    window: { indexedDB: db.indexedDB, caches: {} },
    localStorage: {
      clear() {
        calls.push("local");
        if (failure === "local") throw new Error("storage denied");
      }
    },
    caches: {
      async delete(name) {
        calls.push(name);
        if (failure === "cache") throw new Error("cache denied");
        return failure !== "absent";
      }
    }
  };

  for (const [name, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);

    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }

  db.rows.push({ id: 1, url: "/api/test" });
  return { db, calls, window: globals.window };
};

for (const failure of [
  undefined,
  "absent",
  "unsupported",
  "local",
  "cache",
  "open",
  "open-throw",
  "transaction",
  "store",
  "clear",
  "error",
  "abort"
]) {
  test(
    `clearData ${failure || "success"}: 실제 삭제 결과를 반환하고 다른 저장소도 정리한다`,
    { timeout: 1000 },
    async (t) => {
      const env = storage(t, failure);

      if (failure === "unsupported") {
        delete env.window.caches;
        delete env.window.indexedDB;
      }

      assert.equal(
        await clearData(),
        [undefined, "absent", "unsupported"].includes(failure)
      );

      assert.deepEqual(
        env.calls,
        failure === "unsupported" ? ["local"] : ["local", "offline"]
      );
      const closed = env.db.calls.filter(([type]) => type === "close").length;

      assert.equal(
        closed,
        ["unsupported", "open", "open-throw"].includes(failure) ? 0 : 1
      );
      if ([undefined, "absent", "local", "cache"].includes(failure))
        assert.deepEqual(env.db.rows, []);
    }
  );
}
