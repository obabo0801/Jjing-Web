import { readFileSync } from "node:fs";
import path from "node:path";

import { map } from "#config/html";

const dir = path.join(import.meta.dirname, "../dist");

const load = () =>
  JSON.parse(readFileSync(path.join(dir, map), "utf8"));

export default (name) => path.join(dir, load()[name]);
