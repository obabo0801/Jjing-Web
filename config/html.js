import { createHash } from "node:crypto";
import path from "node:path";

const hash = (name, source) =>
  createHash("sha256")
    .update(name)
    .update(source)
    .digest("hex")
    .slice(0, 8);

export const map = `.${hash("pages", "")}.json`;

export default {
  name: "html-hash",
  apply: "build",
  enforce: "post",

  generateBundle(_, bundle) {
    const pages = {};

    Object.entries(bundle)
      .filter(
        ([name, output]) =>
          name.endsWith(".html") && output.type === "asset"
      )
      .forEach(([name, output]) => {
        const key = path.basename(name, ".html");

        const file = `${hash(name, output.source)}.html`;

        delete bundle[name];

        this.emitFile({
          type: "asset",
          fileName: file,
          source: output.source
        });

        pages[key] = file;
      });

    this.emitFile({
      type: "asset",
      fileName: map,
      source: JSON.stringify(pages)
    });
  }
};
