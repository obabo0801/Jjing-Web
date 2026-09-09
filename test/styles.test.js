import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import output from "#build/output";

const base = path.resolve(import.meta.dirname, "..");
const directory = path.join(base, "src/css");
const pages = output.build.rolldownOptions.input;

test("select 배치 전환 애니메이션은 data-expand에만 적용한다", async () => {
  const css = await readFile(path.join(directory, "common/select.css"), "utf8");
  const base = css.match(/^\.select-menu \{([^}]+)\}/m)?.[1];
  const expanded = css.match(
    /^\.select\[data-expand\] > \.select-menu:not\(\[popover\]\) \{([^}]+)\}/m
  )?.[1];

  assert.ok(base);
  assert.ok(expanded);
  assert.doesNotMatch(
    base.match(/transition:([^;]+);/)?.[1] || "",
    /\b(display|max-height|padding)\b/
  );
  assert.match(expanded, /display 180ms allow-discrete/);
  assert.match(expanded, /max-height 180ms ease/);
});

// 현재 HTML link와 CSS의 따옴표 @import 경로를 검사합니다.
const styles = async (file) => {
  const source = await readFile(file, "utf8");

  return [...source.matchAll(/<link\b[^>]*>/g)]
    .filter(([tag]) => /\brel="stylesheet"/.test(tag))
    .map(([tag]) => tag.match(/\bhref="([^"]+)"/)[1]);
};

const collect = async (file, files = new Set()) => {
  assert.ok(!files.has(file), `중복 또는 순환 CSS 로딩: ${file}`);
  files.add(file);
  const source = await readFile(file, "utf8");

  for (const [, relative] of source.matchAll(/@import\s+"([^"]+)";/g)) {
    await collect(path.resolve(path.dirname(file), relative), files);
  }

  return files;
};

test("모든 페이지는 공통 CSS 다음에 필요한 페이지 CSS만 연결한다", async () => {
  const specific = {
    index: "index",
    image: "image",
    terms: "legal",
    privacy: "legal",
    error: "state",
    offline: "state",
    denied: "state",
    block: "state",
    maint: "state"
  };

  for (const [name, file] of Object.entries(pages)) {
    const expected = ["/src/css/style.css"];

    if (specific[name]) expected.push(`/src/css/${specific[name]}.css`);
    assert.deepEqual(await styles(file), expected, name);
  }
});

test("CSS 로딩 경로는 존재하고 중복·순환·미연결 파일이 없다", async () => {
  const used = new Set();

  for (const file of Object.values(pages)) {
    const loaded = new Set();

    for (const href of await styles(file)) {
      await collect(path.join(base, href.slice(1)), loaded);
    }

    loaded.forEach((item) => used.add(item));
  }

  const files = (await readdir(directory, { recursive: true }))
    .filter((file) => file.endsWith(".css"))
    .map((file) => path.join(directory, file));

  assert.deepEqual([...used].sort(), files.sort());
});

test("공통 CSS는 페이지 전용 규칙 없이 동적 컴포넌트 스타일을 유지한다", async () => {
  const common = await collect(path.join(directory, "style.css"));
  const source = (
    await Promise.all([...common].map((file) => readFile(file, "utf8")))
  ).join("\n");

  assert.doesNotMatch(source, /\.(?:legal|image-link|setup-intro)\b/);
  for (const name of [
    "setup-form",
    "setup-consent",
    "setup-profile",
    "image-editor",
    "image-view",
    "image-select",
    "layer-actions",
    "chatting-message",
    "console",
    "keypad"
  ]) {
    assert.ok(source.includes(`.${name}`), name);
  }

  for (const [file, selector] of [
    ["legal", ".legal"],
    ["image", ".image-link"],
    ["index", ".setup-intro"]
  ]) {
    assert.ok(
      (await readFile(path.join(directory, `${file}.css`), "utf8")).includes(
        selector
      ),
      file
    );
  }
});
