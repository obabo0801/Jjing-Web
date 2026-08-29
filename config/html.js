import path from "node:path";

import hash from "#config/hash";

export const map = `.${hash(8, "pages", "")}.json`;

export default {
  name: "html-hash",
  apply: "build",
  enforce: "post",
  generateBundle(_, bundle) {
    const type = "asset";
    const pages = {};

    for (const [name, output] of Object.entries(bundle)) {
      if (output.type !== type || !name.endsWith(".html")) {
        continue;
      }

      const key = path.basename(name, ".html");
      const source = output.source;
      const file = `${hash(8, name, source)}.html`;

      delete bundle[name];

      this.emitFile({ type, fileName: file, source });

      pages[key] = file;
    }

    const source = JSON.stringify(pages);

    this.emitFile({ type, fileName: map, source });
  }
};
