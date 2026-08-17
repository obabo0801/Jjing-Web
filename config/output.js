import { resolve } from "node:path";

const input = {
  index: resolve(import.meta.dirname, "../index.html"),
  admin: resolve(import.meta.dirname, "../admin.html"),

  error: resolve(import.meta.dirname, "../error.html"),
  offline: resolve(import.meta.dirname, "../offline.html"),

  denied: resolve(import.meta.dirname, "../denied.html"),
  block: resolve(import.meta.dirname, "../block.html"),

  maintenance: resolve(import.meta.dirname, "../maintenance.html"),
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
