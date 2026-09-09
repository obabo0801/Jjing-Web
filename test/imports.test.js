import assert from "node:assert/strict";
import { test } from "node:test";

import { ESLint } from "eslint";

const lint = new ESLint({ fix: false, cache: false });

for (const [filePath, source] of [
  ["router/user.js", "#src/string"],
  ["config/pages.js", "#build/html"],
  ["src/js/script.js", "#db"],
  ["src/js/script.js", "#db/connect"],
  ["shared/string.js", "#db"],
  ["db/index.js", "#common/dom"],
  ["db/index.js", "#build/html"],
  ["src/js/script.js", "#service/events"],
  ["shared/string.js", "#service/profile"],
  ["config/pages.js", "#service/locale"],
  ["db/index.js", "#service/manage"],
  ["build/html.js", "#service/log"],
  ["service/manage.js", "#router/profile"],
  ["service/manage.js", "#middleware/admin"],
  ["service/manage.js", "#common/dom"],
  ["service/manage.js", "#build/html"],
  ["src/js/common/mount.js", "#src/init"],
  ["src/js/common/push.js", "#src/pwa"],
  ["src/js/common/mount.js", "#ui/theme"],
  ["shared/string.js", "#common/dom"],
  ["shared/string.js", "node:fs"]
]) {
  test(`${filePath}에서 ${source} 역방향 import를 차단한다`, async () => {
    const [result] = await lint.lintText(
      `export { default } from "${source}";`,
      { filePath }
    );

    assert.ok(
      result.messages.some(
        (message) => message.ruleId === "no-restricted-imports"
      )
    );
  });
}

test("서버와 브라우저에서 shared 모듈을 사용할 수 있다", async () => {
  for (const filePath of ["router/user.js", "src/js/script.js"]) {
    const [result] = await lint.lintText(
      'export { default } from "#shared/string";',
      { filePath }
    );

    assert.equal(result.errorCount, 0);
  }
});

test("라우터는 서비스를 사용하고 서비스는 DB·설정·공용 규칙을 사용할 수 있다", async () => {
  for (const [filePath, source] of [
    ["router/profile.js", "#service/manage"],
    ["service/manage.js", "#db"],
    ["service/manage.js", "#config/path"],
    ["service/manage.js", "#shared/role"],
    ["service/manage.js", "#service/log"]
  ]) {
    const [result] = await lint.lintText(
      `export { default } from "${source}";`,
      { filePath }
    );

    assert.equal(result.errorCount, 0);
  }
});

test("shared에는 브라우저·Node 전역 변수를 허용하지 않는다", async () => {
  const [result] = await lint.lintText(
    "export const read = () => [document, process];",
    { filePath: "shared/string.js" }
  );

  assert.equal(
    result.messages.filter((message) => message.ruleId === "no-undef").length,
    2
  );
});

for (const [rule, source] of [
  ["no-unused-vars", "const unused = 1;"],
  ["no-unused-vars", 'import unused from "#shared/string";'],
  ["no-undef", "export const value = missing;"],
  ["no-unreachable", "export function read() { return 1; return 2; }"],
  [
    "no-use-before-define",
    "export const read = () => value;\nconst value = 1;"
  ],
  ["no-dupe-keys", "export default { key: 1, key: 2 };"],
  ["no-constant-binary-expression", "export const value = {} || null;"]
]) {
  test(`${rule} 위반은 경고가 아닌 오류로 검사한다: ${source}`, async () => {
    const [result] = await lint.lintText(source, {
      filePath: "shared/check.js"
    });

    assert.ok(
      result.messages.some(
        (message) => message.ruleId === rule && message.severity === 2
      )
    );
  });
}

test("함수 선언문의 전방 참조와 사용 예정인 공개 export는 허용한다", async () => {
  const [result] = await lint.lintText(
    "export const planned = () => read();\nfunction read() { return 1; }",
    { filePath: "shared/check.js" }
  );

  assert.equal(result.errorCount, 0);
  assert.equal(result.warningCount, 0);
});
