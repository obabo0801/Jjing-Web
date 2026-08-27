import { createHash } from "node:crypto";

const hash = (name) =>
  createHash("sha256")
    .update(name.toLowerCase())
    .digest("hex")
    .slice(0, 8);

const rename = (code) =>
  code.replace(
    /\bdata-([a-z][a-z0-9_.:-]*)/gi,

    (_, name) => `data-${hash(name)}`
  );

export const css = {
  postcssPlugin: "data-hash",

  Once(root) {
    root.walkRules((rule) => {
      rule.selector = rename(rule.selector);
    });

    root.walkDecls((declaration) => {
      declaration.value = rename(declaration.value);
    });

    root.walkAtRules((rule) => {
      rule.params = rename(rule.params);
    });
  }
};

export default {
  name: "data-hash",
  apply: "build",
  enforce: "pre",
  transformIndexHtml: rename,

  transform(code, id) {
    if (/\.js(\?|$)/.test(id)) {
      return rename(code);
    }
  }
};
