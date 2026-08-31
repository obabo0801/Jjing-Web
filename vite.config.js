import { defineConfig, loadEnv } from "vite";

import data, { css } from "#config/data";
import html from "#config/html";
import output from "#config/output";
import proxy from "#config/proxy";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, ".", "");
  const api = proxy(env.PORT || 3000);

  return {
    ...output,
    css:
      command === "build"
        ? { postcss: { plugins: [css] } }
        : undefined,
    plugins: [data, html],
    server: { host: true, port: 5173, proxy: api }
  };
});
