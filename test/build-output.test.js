import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { build } from "vite";

import config from "../vite.config.js";
import { map } from "#config/html";
import hash from "#config/hash";

test("실제 Vite 빌드는 HTML 매핑·자산 연결·data 변환·페이지 CSS를 유지한다", async () => {
  const options = config({ command: "build", mode: "production" });
  // 실제 플러그인을 사용하되 dist와 임시 설정 번들을 쓰지 않습니다.
  const result = await build({
    ...options,
    root: path.resolve(import.meta.dirname, ".."),
    configFile: false,
    logLevel: "silent",
    build: { ...options.build, write: false }
  });
  const files = new Map(result.output.map((file) => [file.fileName, file]));
  const pages = JSON.parse(files.get(map).source);
  const js = result.output
    .filter((file) => file.type === "chunk")
    .map((file) => file.code)
    .join("\n");
  const attribute = `data-${hash(8, "theme")}`;

  assert.deepEqual(
    Object.keys(pages).sort(),
    Object.keys(options.build.rolldownOptions.input).sort()
  );
  assert.ok(js.includes(attribute));
  for (const [name, file] of Object.entries(pages)) {
    assert.match(file, /^[a-f0-9]{8}\.html$/);
    const html = String(files.get(file).source);
    const links = [...html.matchAll(/(?:src|href)="\/([^"?#]+)"/g)]
      .map(([, link]) => link)
      .filter((link) => link.startsWith("assets/"));
    const styles = links.filter((link) => link.endsWith(".css"));

    assert.ok(
      links.some((link) => link.endsWith(".js")),
      name
    );
    assert.ok(styles.length, name);
    links.forEach((link) => assert.ok(files.has(link), `${name}: ${link}`));
    const css = styles.map((link) => String(files.get(link).source)).join("\n");

    assert.ok(html.includes(attribute), name);
    assert.ok(css.includes(attribute), name);
    assert.doesNotMatch(html, /\bdata-(?:theme|i18n)=/);
    assert.equal(css.includes(".legal{"), ["terms", "privacy"].includes(name));
    assert.equal(css.includes(".image-link{"), name === "image");
    assert.equal(css.includes(".setup-intro{"), name === "index");
    assert.ok(css.includes(".layer-actions{"), name);
  }

  for (const file of result.output.filter((file) => file.type === "chunk")) {
    for (const imported of [...file.imports, ...file.dynamicImports]) {
      assert.ok(files.has(imported), `${file.fileName}: ${imported}`);
    }
  }
});
