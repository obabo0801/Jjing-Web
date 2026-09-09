import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

import { Linter } from "eslint";

test("브라우저 모듈은 정적·문자열 동적 import에 순환 의존성이 없다", async () => {
  const base = path.resolve(import.meta.dirname, "..");
  const files = (await readdir(path.join(base, "src/js"), { recursive: true }))
    .filter((file) => file.endsWith(".js"))
    .map((file) => path.join(base, "src/js", file));
  const graph = new Map();
  const parser = new Linter();

  for (const file of files) {
    const dependencies = [];
    const collect = (node) => {
      const source = node.source?.value;

      if (
        typeof source !== "string" ||
        !(source.startsWith("#") || source.startsWith("."))
      )
        return;
      const url = source.startsWith("#")
        ? import.meta.resolve(source)
        : new URL(source, pathToFileURL(file));

      if (String(url).startsWith("file:"))
        dependencies.push(path.resolve(fileURLToPath(url)));
    };

    const messages = parser.verify(await readFile(file, "utf8"), {
      languageOptions: { ecmaVersion: "latest", sourceType: "module" },
      plugins: {
        dependencies: {
          rules: {
            collect: {
              meta: { schema: [] },
              create: () => ({
                ImportDeclaration: collect,
                ExportNamedDeclaration: collect,
                ExportAllDeclaration: collect,
                ImportExpression: collect
              })
            }
          }
        }
      },
      rules: { "dependencies/collect": "error" }
    });

    assert.deepEqual(messages, [], file);
    graph.set(file, dependencies);
  }

  const complete = new Set();
  const active = new Set();
  const trail = [];
  const visit = (file) => {
    if (!graph.has(file) || complete.has(file)) return;
    assert.ok(
      !active.has(file),
      `순환 import: ${[...trail, file].map((item) => path.relative(base, item)).join(" → ")}`
    );
    active.add(file);
    trail.push(file);
    graph.get(file).forEach(visit);
    trail.pop();
    active.delete(file);
    complete.add(file);
  };

  files.forEach(visit);
});
