import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, beforeEach, test } from "node:test";

import hash from "#config/hash";
import { fetch, reset, state } from "./fixtures/speech.js";

const fixture = JSON.stringify(
  new URL("./fixtures/speech.js", import.meta.url).href
);

const modules = {
  "#config/path": `export { tts, stt, mkdirSync, readFile, writeFile, rm } from ${fixture}`,
  "#db": `export { run } from ${fixture}`,
  "@google-cloud/text-to-speech": `export { TextToSpeechClient } from ${fixture}`,
  "@google-cloud/speech": `import { SpeechClient } from ${fixture}; export default { v2: { SpeechClient } };`
};
const names = ["TTS", "STT", "GOOGLE_APPLICATION_CREDENTIALS"];
const environment = names.map((name) => [name, process.env[name]]);

process.env.TTS = "json";
process.env.STT = "json";
process.env.GOOGLE_APPLICATION_CREDENTIALS = "test-only-credentials.json";

after(() => {
  for (const [name, value] of environment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

// SDK·fetch·파일·DB를 모두 대체하여 인증과 외부 호출을 막습니다.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (modules[specifier])
      return {
        url: `data:text/javascript,${encodeURIComponent(modules[specifier])}`,
        shortCircuit: true
      };
    return next(specifier, context);
  }
});

const { default: synthesize } = await import("#service/tts");
const { default: save, supported } = await import("#service/stt");
const { default: recognize, enabled } = await import("#service/speech");

hooks.deregister();

let clock = 1_000_000;

beforeEach((context) => {
  reset();
  clock += 120_000;
  context.mock.method(Date, "now", () => clock);
  context.mock.method(globalThis, "fetch", fetch);
});

const options = { uid: "user", time: "2026-09-08 12:34:56" };
const request = { text: "hello", lang: "ko", rate: 1, pitch: 0 };
const flush = () => new Promise(setImmediate);

test("Google 합성은 유니코드 180자씩 나누고 기존 캐시 키와 기록을 유지한다", async () => {
  const text = "🐶".repeat(181);
  const result = await synthesize(
    { ...request, text, lang: "JA", rate: 0.5 },
    { ...options, type: "google" }
  );

  assert.equal(state.requests.length, 2);
  assert.deepEqual(
    state.requests.map(({ url }) => [...url.searchParams.get("q")].length),
    [180, 1]
  );
  assert.equal(state.requests[0].url.origin, "https://translate.google.com");
  assert.equal(state.requests[0].url.pathname, "/translate_tts");
  assert.equal(state.requests[0].url.searchParams.get("tl"), "ja");
  assert.equal(state.requests[0].url.searchParams.get("ttsspeed"), "0.24");
  assert.equal(
    result.file,
    `${hash(32, JSON.stringify({ provider: "google", text, lang: "ja-JP", rate: 0.24 }))}.mp3`
  );
  assert.equal(result.audio.toString(), "google-audiogoogle-audio");
  assert.equal(result.provider, "google");
  assert.equal(result.voice, "default");
  assert.equal(result.cached, false);
  assert.deepEqual(state.records[0].params, [
    result.file,
    options.uid,
    text,
    options.time
  ]);
});

test("Google에서 사용하지 않는 pitch·voice 차이는 같은 캐시를 사용한다", async () => {
  const first = await synthesize(request, { ...options, type: "google" });
  const second = await synthesize(
    { ...request, pitch: 20, voice: "different" },
    { ...options, type: "google" }
  );

  assert.equal(first.file, second.file);
  assert.equal(second.cached, true);
  assert.equal(state.requests.length, 1);
  assert.equal(state.records.length, 1);
});

test("Cloud 합성은 언어·속도·음높이를 정규화하고 기존 SDK 요청을 유지한다", async () => {
  const result = await synthesize(
    { ...request, lang: "EN-us", rate: 100, pitch: -100, voice: "en-US-Test" },
    { ...options, type: "cloud" }
  );

  assert.deepEqual(state.clients[0], {
    type: "tts",
    options: { keyFilename: "test-only-credentials.json" }
  });

  assert.deepEqual(state.syntheses[0], {
    request: {
      input: { text: "hello" },
      voice: { languageCode: "en-US", name: "en-US-Test" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 2, pitch: -20 }
    },
    options: { timeout: 5000 }
  });
  assert.equal(result.provider, "cloud");
  assert.equal(result.voice, "en-US-Test");
  assert.equal(result.cached, false);
  const cached = await synthesize(
    { ...request, lang: "EN-us", rate: 100, pitch: -100, voice: "en-US-Test" },
    { ...options, type: "cache" }
  );

  assert.equal(cached.cached, true);
  assert.equal(state.syntheses.length, 1);
});

test("Chirp 음성에는 속도·음높이를 보내지 않고 base64 응답을 디코딩한다", async () => {
  state.audio = Buffer.from("decoded").toString("base64");
  const result = await synthesize(
    { ...request, voice: "ko-KR-Chirp3-HD-Test" },
    { ...options, type: "cloud" }
  );

  assert.deepEqual(state.syntheses[0].request.audioConfig, {
    audioEncoding: "MP3"
  });
  assert.equal(result.audio.toString(), "decoded");
});

test("캐시 전용 요청은 합성하지 않고 Cloud 캐시를 먼저 조회한다", async () => {
  assert.equal(await synthesize(request, { ...options, type: "cache" }), null);
  assert.equal(state.requests.length, 0);
  assert.equal(state.syntheses.length, 0);
  await synthesize(request, { ...options, type: "google" });
  assert.equal(
    (await synthesize(request, { ...options, type: "cache" })).provider,
    "google"
  );
  await synthesize(request, { ...options, type: "cloud" });
  assert.equal(
    (await synthesize(request, { ...options, type: "cache" })).provider,
    "cloud"
  );
});

test("동시 합성 요청은 한 번만 생성·저장하고 대기 요청을 캐시로 표시한다", async () => {
  const pending = Promise.withResolvers();

  state.fetchTask = pending.promise;
  const first = synthesize(request, { ...options, type: "google" });
  const second = synthesize(request, {
    ...options,
    uid: "other",
    type: "google"
  });

  await flush();
  assert.equal(state.requests.length, 1);
  pending.resolve(
    new Response("shared-audio", { headers: { "content-type": "audio/mpeg" } })
  );
  const results = await Promise.all([first, second]);

  assert.equal(results[0].file, results[1].file);
  assert.deepEqual(
    results.map(({ cached }) => cached),
    [false, true]
  );
  assert.equal(state.writes.length, 1);
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].params[1], options.uid);
});

test("Cloud 실패 후 대체 합성과 60초 재시도 대기를 유지한다", async () => {
  state.cloudError = new Error("cloud unavailable");
  assert.equal((await synthesize(request, options)).provider, "google");
  assert.equal(state.closes, 1);
  assert.equal(
    await synthesize(
      { ...request, text: "cloud-only" },
      { ...options, type: "cloud" }
    ),
    null
  );
  await synthesize({ ...request, text: "fallback" }, options);
  assert.equal(state.syntheses.length, 1);
  clock += 60_001;
  state.cloudError = null;
  assert.equal(
    (await synthesize({ ...request, text: "retry" }, options)).provider,
    "cloud"
  );
  assert.equal(state.syntheses.length, 2);
});

test("Cloud 초기화 시간 초과는 클라이언트를 닫고 Cloud 전용 요청에 null을 반환한다", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  state.initializeTask = new Promise(() => {});
  const pending = synthesize(request, { ...options, type: "cloud" });

  await flush();
  context.mock.timers.tick(5000);
  assert.equal(await pending, null);
  assert.equal(state.syntheses.length, 0);
  assert.equal(state.closes, 1);
});

test("DB 잠금 오류는 대체 합성으로 숨기지 않고 파일을 제거한 뒤 재시도할 수 있다", async () => {
  state.dbError = Object.assign(new Error("locked"), { code: "SQLITE_BUSY" });
  await assert.rejects(synthesize(request, options), { code: "SQLITE_BUSY" });
  assert.equal(state.files.size, 0);
  assert.equal(state.requests.length, 0);
  assert.equal(state.closes, 0);
  state.dbError = null;
  assert.equal((await synthesize(request, options)).cached, false);
  assert.equal(state.syntheses.length, 2);
  assert.equal(state.records.length, 1);
});

test("Google 응답·파일 저장·읽기 오류를 캐시 성공으로 처리하지 않는다", async () => {
  state.fetchTask = Promise.resolve(
    new Response("invalid", { headers: { "content-type": "text/html" } })
  );
  await assert.rejects(synthesize(request, { ...options, type: "google" }));
  state.fetchTask = null;
  state.writeError = Object.assign(new Error("disk full"), { code: "ENOSPC" });
  await assert.rejects(synthesize(request, { ...options, type: "google" }), {
    code: "ENOSPC"
  });
  assert.equal(state.records.length, 0);
  state.writeError = null;
  state.readError = Object.assign(new Error("denied"), { code: "EACCES" });
  await assert.rejects(synthesize(request, { ...options, type: "cache" }), {
    code: "EACCES"
  });
});

test("STT는 지원 MIME만 저장하며 동일 파일은 재기록하지 않는다", async () => {
  for (const [type, extension] of [
    ["audio/webm", "webm"],
    ["audio/ogg", "ogg"],
    ["audio/mp4", "m4a"]
  ]) {
    const audio = Buffer.from(type);
    const data = { ...options, type, text: "recognized" };
    const file = await save(audio, data);

    assert.equal(supported(type), true);
    assert.equal(file, `${hash(32, audio)}.${extension}`);
    assert.equal(await save(audio, { ...data, uid: "other" }), file);
    assert.deepEqual(state.records.at(-1).params, [
      file,
      options.uid,
      "recognized",
      options.time
    ]);
  }
  assert.equal(state.records.length, 3);
  assert.equal(supported("audio/wav"), false);
  assert.equal(
    await save(Buffer.from("test"), { ...options, type: "audio/wav" }),
    null
  );

  assert.equal(
    await save("not-buffer", { ...options, type: "audio/webm" }),
    null
  );
});

test("STT 기록 실패 시 새 파일을 제거하고 재시도를 허용한다", async () => {
  const audio = Buffer.from("audio");
  const data = { ...options, type: "audio/webm", text: "recognized" };

  state.dbError = new Error("record failed");
  await assert.rejects(save(audio, data), /record failed/);
  assert.equal(state.files.size, 0);
  state.dbError = null;
  assert.ok(await save(audio, data));
  assert.equal(state.records.length, 1);
});

test("음성 인식은 빈 입력을 제외하고 첫 대안의 텍스트·신뢰도를 결합한다", async () => {
  assert.equal(enabled, true);
  assert.deepEqual(await recognize(Buffer.alloc(0), "ko-KR"), {
    text: "",
    confidence: null
  });

  assert.deepEqual(await recognize("invalid", "ko-KR"), {
    text: "",
    confidence: null
  });
  assert.equal(state.recognitions.length, 0);
  state.results = [
    {
      alternatives: [
        { transcript: " hello ", confidence: 0.3 },
        { transcript: "ignored", confidence: 1 }
      ]
    },
    { alternatives: [{ transcript: " world ", confidence: 0.9 }] },
    { alternatives: [{ transcript: "", confidence: 0 }] },
    {}
  ];
  const audio = Buffer.from("speech");
  const result = await recognize(audio, "ko-KR");

  assert.equal(result.text, "hello world");
  assert.ok(Math.abs(result.confidence - 0.6) < 0.000001);
  assert.deepEqual(state.recognitions[0], {
    recognizer: "projects/test-project/locations/global/recognizers/_",
    config: {
      autoDecodingConfig: {},
      languageCodes: ["ko-KR"],
      model: "short"
    },
    content: audio
  });

  assert.deepEqual(state.clients[0], {
    type: "stt",
    options: { keyFilename: "test-only-credentials.json" }
  });
  await recognize(audio, "en-US");
  assert.equal(state.projects, 1);
});

test("인식 결과가 없으면 빈 결과를 반환하고 SDK 실패는 호출자에게 전달한다", async () => {
  assert.deepEqual(await recognize(Buffer.from("speech"), "ko-KR"), {
    text: "",
    confidence: null
  });
  state.speechError = new Error("recognize failed");
  await assert.rejects(
    recognize(Buffer.from("speech"), "ko-KR"),
    /recognize failed/
  );
});
