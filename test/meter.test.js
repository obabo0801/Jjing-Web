import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const modules = {
  "#common/audio": "export const context = () => globalThis.testAudio;",
  "#common/dom": "export const on = () => () => {};"
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
const { meter } = await import("#common/voice/audio");

hooks.deregister();

for (const when of ["before", "callback", "after"]) {
  test(`meter ${when}: 중지 후 콜백·프레임 예약을 멈추고 중복 해제하지 않는다`, (t) => {
    const frames = new Map();
    const levels = [];

    let id = 0;
    let disconnected = 0;

    const globals = {
      testAudio: {
        createMediaStreamSource: () => ({
          connect() {},
          disconnect() {
            disconnected++;
          }
        }),
        createAnalyser: () => ({
          fftSize: 1024,
          getByteTimeDomainData: (data) => data.fill(128)
        })
      },
      requestAnimationFrame: (callback) => {
        frames.set(++id, callback);
        return id;
      },
      cancelAnimationFrame: (id) => frames.delete(id)
    };

    for (const [name, value] of Object.entries(globals)) {
      const previous = Object.getOwnPropertyDescriptor(globalThis, name);

      Object.defineProperty(globalThis, name, { configurable: true, value });
      t.after(() => {
        if (previous) Object.defineProperty(globalThis, name, previous);
        else delete globalThis[name];
      });
    }

    const stop = meter({}, (value) => {
      levels.push(value);
      if (when === "callback") stop();
    });
    const [[frame, callback]] = frames;

    if (when === "before") stop();
    else {
      frames.delete(frame);
      callback();
    }
    if (when === "after") assert.equal(frames.size, 1);
    stop();
    stop();
    callback();
    assert.equal(frames.size, 0);
    assert.equal(disconnected, 1);
    assert.deepEqual(levels, when === "before" ? [] : [0]);
  });
}
