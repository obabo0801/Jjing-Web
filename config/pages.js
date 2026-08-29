import { readFileSync } from "node:fs";
import path from "node:path";

import { map } from "#config/html";

const dir = path.join(import.meta.dirname, "../dist");

let pages;

const load = () => {
  pages ||= JSON.parse(readFileSync(path.join(dir, map), "utf8"));

  return pages;
};

export default (name) => path.join(dir, load()[name]);
