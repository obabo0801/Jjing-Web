import { defineConfig, loadEnv } from "vite";

import data, { css } from "#build/data";
import html from "#build/html";
import output from "#build/output";
import proxy from "#build/proxy";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, ".", "");
  const api = proxy(env.PORT || 3000);

  return {
    ...output,
    css: command === "build" ? { postcss: { plugins: [css] } } : undefined,
    plugins: [data, html],
    server: { host: true, port: 5173, proxy: api }
  };
});
