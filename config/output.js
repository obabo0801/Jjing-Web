import { resolve } from "node:path";

const root = import.meta.dirname;
const page = (name) =>
  resolve(root, "../src", `${name}.html`);
const input = {
  index: resolve(root, "../index.html"),
  admin: page("admin"),
  terms: page("terms"),
  privacy: page("privacy"),
  error: page("error"),
  offline: page("offline"),
  denied: page("denied"),
  block: page("block"),
  maint: page("maint")
};
const output = {
  entryFileNames: "assets/[hash].js",
  chunkFileNames: "assets/[hash].js",
  assetFileNames: "assets/[hash][extname]"
};

export default {
  build: { rolldownOptions: { input, output } }
};
