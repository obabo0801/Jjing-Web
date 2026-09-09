import assert from "node:assert/strict";
import { test } from "node:test";

import * as consent from "#shared/consent";

const agreement = () => ({ terms: consent.terms, privacy: consent.privacy });

test("필수 동의와 현재 문서 버전이 모두 일치해야 한다", () => {
  assert.equal(consent.valid(agreement()), true);
});

test("동의가 없거나 일부 값이 빠지면 거부한다", () => {
  for (const value of [undefined, null, {}]) {
    assert.equal(consent.valid(value), false);
  }

  for (const key of ["terms", "privacy"]) {
    const value = agreement();

    delete value[key];
    assert.equal(consent.valid(value), false);
  }
});

test("현재 문서 버전과 다른 값이나 타입을 동의로 인정하지 않는다", () => {
  assert.equal(consent.valid({ ...agreement(), terms: true }), false);
  assert.equal(consent.valid({ ...agreement(), privacy: true }), false);
  assert.equal(
    consent.valid({ ...agreement(), terms: Number(consent.terms) }),
    false
  );
  assert.equal(consent.valid({ ...agreement(), terms: "old-version" }), false);
  assert.equal(
    consent.valid({ ...agreement(), privacy: "old-version" }),
    false
  );
});
