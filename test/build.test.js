import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import data, { css } from "#build/data";
import html from "#build/html";
import output from "#build/output";
import proxy from "#build/proxy";
import hash from "#config/hash";
import { map } from "#config/html";

test("data-* 변환은 JS·HTML·CSS에서 같은 hash를 사용한다", () => {
  assert.equal(
    data.transform('document.querySelector("[data-test]")', "fixture.js"),
    'document.querySelector("[data-9f86d081]")'
  );

  assert.equal(
    data.transformIndexHtml('<button data-test="yes"></button>'),
    '<button data-9f86d081="yes"></button>'
  );
  const rule = { selector: "[data-test]" };
  const declaration = { value: "attr(data-test)" };
  const atRule = { params: "selector([data-test])" };

  css.Once({
    walkRules: (visit) => visit(rule),
    walkDecls: (visit) => visit(declaration),
    walkAtRules: (visit) => visit(atRule)
  });
  assert.equal(rule.selector, "[data-9f86d081]");
  assert.equal(declaration.value, "attr(data-9f86d081)");
  assert.equal(atRule.params, "selector([data-9f86d081])");
});

test("HTML 변환은 같은 매핑 파일명과 hash 규칙을 유지한다", () => {
  const source = "<!doctype html><title>test</title>";
  const asset = { type: "asset", source: "body {}" };
  const bundle = {
    "index.html": { type: "asset", source },
    "src/privacy.html": { type: "asset", source },
    "assets/test.css": asset
  };
  const emitted = [];

  html.generateBundle.call(
    { emitFile: (value) => emitted.push(value) },
    {},
    bundle
  );
  assert.equal(map, ".bfa062de.json");
  assert.equal(bundle["index.html"], undefined);
  assert.equal(bundle["src/privacy.html"], undefined);
  assert.equal(bundle["assets/test.css"], asset);
  assert.equal(emitted.length, 3);
  const mapping = emitted.find((item) => item.fileName === map);

  assert.deepEqual(JSON.parse(mapping.source), {
    index: `${hash(8, "index.html", source)}.html`,
    privacy: `${hash(8, "src/privacy.html", source)}.html`
  });
  assert.equal(emitted[0].source, source);
});

test("다중 HTML 진입점과 자산 파일명 규칙을 유지한다", () => {
  const { input, output: files } = output.build.rolldownOptions;
  const root = path.resolve(import.meta.dirname, "..");

  assert.equal(input.index, path.join(root, "index.html"));
  for (const name of [
    "admin",
    "image",
    "terms",
    "privacy",
    "error",
    "offline",
    "denied",
    "block",
    "maint"
  ]) {
    assert.equal(input[name], path.join(root, "src", `${name}.html`));
  }
  assert.equal(Object.keys(input).length, 10);
  assert.deepEqual(files, {
    entryFileNames: "assets/[hash].js",
    chunkFileNames: "assets/[hash].js",
    assetFileNames: "assets/[hash][extname]"
  });
});

test("개발 프록시는 기존 API와 이미지 URL을 유지한다", () => {
  const routes = [
    "/api",
    "/upload",
    "/cb755344",
    "/42cd777c",
    "/bc8c7ee0",
    "/2961c4eb"
  ];

  assert.deepEqual(Object.keys(proxy()), routes);
  for (const options of Object.values(proxy(4321))) {
    assert.deepEqual(options, { target: "http://localhost:4321", xfwd: true });
  }
  assert.equal(proxy()["/api"].target, "http://localhost:3000");
});
