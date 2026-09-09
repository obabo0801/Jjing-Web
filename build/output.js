import * as path from "#config/path";

const page = (name) => path.src(`${name}.html`);

const input = {
  index: path.root("index.html"),
  admin: page("admin"),
  image: page("image"),
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

export default { build: { rolldownOptions: { input, output } } };
