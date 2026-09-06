import { map } from "#config/html";
import * as path from "#config/path";

let pages;

const load = () =>
  (pages ??= JSON.parse(path.readFileSync(path.dist(map), "utf8")));

export default (name) => path.dist(load()[name]);
