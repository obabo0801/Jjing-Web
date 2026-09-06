import { readFileSync } from "node:fs";
import path from "node:path";

export { mkdirSync } from "node:fs";

export { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";

export { pathToFileURL } from "node:url";

const base = path.resolve(import.meta.dirname, "..");

export const root = (...parts) => path.join(base, ...parts);

export const src = (...parts) => root("src", ...parts);

export const dist = (...parts) => root("dist", ...parts);

export const data = (...parts) => root("data", ...parts);

export const log = (...parts) => data("log", ...parts);

export const access = (...parts) => log("access", ...parts);

export const upload = (...parts) => data("upload", ...parts);

export const stt = (...parts) => data("stt", ...parts);

export const tts = (...parts) => data("tts", ...parts);

export const locales = (...parts) => root("locales", ...parts);

const load = (file) => JSON.parse(readFileSync(access(file), "utf8"));

export const map = (file, name) => access(load(file)[name]);

export { readFileSync };
