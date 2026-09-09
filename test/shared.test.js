import assert from "node:assert/strict";
import { test } from "node:test";

import string from "#shared/string";
import * as route from "#shared/route";
import limit from "#shared/upload";

test("문자열 도우미는 값을 변환하거나 공백을 제거하지 않는다", () => {
  assert.equal(string(" hello "), " hello ");
  assert.equal(string("", "fallback"), "");
  for (const value of [undefined, null, false, 0, {}, []]) {
    assert.equal(string(value), "");
    assert.equal(string(value, "fallback"), "fallback");
  }
});

test("폴더 이동 후에도 공개 API 경로와 응답 키는 바뀌지 않는다", () => {
  assert.deepEqual(
    { ...route },
    {
      admin: "/8c6976e5",
      i18n: "/5b59f3e4",
      content: "18ac3e73",
      events: "/862417b9",
      fcm: "/65654edc",
      profile: "/1900eab6",
      push: "/d107ea36",
      stt: "/f9eec27a",
      tts: "/317e938a",
      usage: "/0a4e4c29",
      user: "/04f8996d"
    }
  );
});

test("서버와 브라우저의 이미지 업로드 제한은 15MB다", () => {
  assert.equal(limit, 15 * 1024 * 1024);
});
