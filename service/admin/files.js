import * as fs from "node:fs/promises";
import { sep, extname } from "node:path";
import * as path from "#config/path";
import * as db from "#db";

const roots = { upload: path.upload, tts: path.tts, stt: path.stt };
const images = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const audio = new Set([".mp3", ".webm", ".ogg", ".m4a", ".wav"]);
const type = (name) =>
  images.has(extname(name)) ? "image" : audio.has(extname(name)) ? "audio" : "";

const invalid = () => {
  throw Object.assign(new Error("Invalid file query"), { status: 400 });
};

async function resolve(kind, name = "") {
  if (!Object.hasOwn(roots, kind) || typeof name !== "string" || name.length > 500) invalid();

  if (name && !name.split("/").every((part) => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part)))
    invalid();
  const root = await fs.realpath(roots[kind]());
  const file = roots[kind](...name.split("/"));
  const real = await fs.realpath(file);
  const stat = await fs.lstat(file);

  if ((real !== root && !real.startsWith(`${root}${sep}`)) || stat.isSymbolicLink()) invalid();
  return { file: real, stat };
}

export async function content(kind, name) {
  if (typeof name !== "string" || !name || !type(name)) invalid();
  const target = await resolve(kind, name);

  if (!target.stat.isFile()) invalid();
  return target.file;
}

export async function list(kind, options) {
  const folder = options.folder || "";
  const search = options.q || "";
  const page = options.page || "0";

  if (typeof search !== "string" || search.length > 200 || !/^\d{1,7}$/.test(page)) invalid();
  let target;

  try {
    target = await resolve(kind, folder);
  } catch (error) {
    if (error.code === "ENOENT") return { items: [], total: 0 };
    throw error;
  }
  if (!target.stat.isDirectory()) invalid();
  const matches = new Set(
    kind !== "upload" && search
      ? (
          await db.all(`SELECT file FROM ${kind} WHERE instr(lower(text), lower(?)) > 0`, [search])
        ).map((item) => item.file)
      : []
  );

  const entries = (await fs.readdir(target.file, { withFileTypes: true }))
    .filter(
      (item) =>
        (item.isDirectory() || (item.isFile() && type(item.name))) &&
        (item.name.toLowerCase().includes(search.toLowerCase()) || matches.has(item.name))
    )
    .sort(
      (a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name)
    );
  const items = [];

  for (const item of entries.slice(Number(page) * 30, Number(page) * 30 + 30)) {
    const name = [folder, item.name].filter(Boolean).join("/");
    const { stat } = await resolve(kind, name);
    const record =
      kind !== "upload" && item.isFile()
        ? await db.get(`SELECT text, time FROM ${kind} WHERE file = ? ORDER BY time DESC LIMIT 1`, [
            item.name
          ])
        : null;

    items.push({
      name: item.name,
      file: name,
      type: item.isDirectory() ? "folder" : type(item.name),
      size: stat.size,
      time: stat.mtime.toISOString(),
      ...record
    });
  }
  return { items, total: entries.length };
}
