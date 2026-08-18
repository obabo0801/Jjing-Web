import { resolve } from "node:path";

const page = (name) =>
  resolve(
    import.meta.dirname, `../src/${name}.html`
  );

const input = {
  index: resolve(
    import.meta.dirname, "../index.html"
  ),

  admin: page("admin"),

  terms: page("terms"),
  privacy: page("privacy"),

  error: page("error"),
  offline: page("offline"),

  denied: page("denied"),
  block: page("block"),

  maintenance: page("maintenance")
};

const output = {
  entryFileNames: "assets/[hash].js",
  chunkFileNames: "assets/[hash].js",
  assetFileNames: "assets/[hash][extname]"
};

export default {
  build: {
    rolldownOptions: { input, output }
  }
};
