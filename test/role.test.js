import assert from "node:assert/strict";
import { test } from "node:test";

import * as role from "#shared/role";

test("관리자 역할만 staff로 판정한다", () => {
  assert.equal(role.staff(role.root), true);
  assert.equal(role.staff(role.admin), true);

  for (const value of [role.user, null, undefined, "-1", 1]) {
    assert.equal(role.staff(value), false);
  }
});

for (const [viewer, target, allowed] of [
  [role.root, role.root, false],
  [role.root, role.admin, true],
  [role.root, role.user, true],
  [role.admin, role.root, false],
  [role.admin, role.admin, false],
  [role.admin, role.user, true],
  [role.user, role.root, false],
  [role.user, role.admin, false],
  [role.user, role.user, false]
]) {
  test(`권한 ${viewer} → ${target}: 관리 ${allowed ? "허용" : "거부"}`, () => {
    assert.equal(
      role.manages(
        { uid: "actor", role: viewer },
        { uid: "target", role: target }
      ),
      allowed
    );
  });
}

test("관리자는 자신의 권한을 관리할 수 없다", () => {
  for (const value of [role.root, role.admin]) {
    const user = { uid: "same-user", role: value };

    assert.equal(role.manages(user, user), false);
  }
});

test("잘못된 역할이나 누락된 대상은 관리할 수 없다", () => {
  const root = { uid: "actor", role: role.root };

  assert.equal(role.manages(null, { uid: "target", role: role.user }), false);
  assert.equal(role.manages(root, null), false);
  assert.equal(role.manages(root, { uid: "target", role: "0" }), false);
});
