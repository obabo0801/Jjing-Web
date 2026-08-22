import { createHash } from "node:crypto";

export const style = {
  postcssPlugin: "data-hash",

  Once(root) {
    root.walkRules((rule) => {
      rule.selector = replace(rule.selector);
    });

    root.walkDecls((decl) => {
      decl.value = replace(decl.value);
    });

    root.walkAtRules((rule) => {
      rule.params = replace(rule.params);
    });
  }
};

const hash = (name) =>
  createHash("sha256")
    .update(name.toLowerCase())
    .digest("hex")
    .slice(0, 8);

const replace = (code) =>
  code.replace(
    /\bdata-([a-z][a-z0-9_.:-]*)/gi,
    (_, name) => `data-${hash(name)}`
  );

export default {
  name: "data-hash",
  apply: "build",
  enforce: "pre",
  transformIndexHtml: replace,

  transform(code, id) {
    if (/\.js(\?|$)/.test(id)) {
      return replace(code);
    }
  }
};
