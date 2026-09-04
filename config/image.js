import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import hash from "#config/hash";

const extensions = {
  jpeg: "jpg",
  png: "png",
  webp: "webp"
};

const save = async (target, data) => {
  try {
    await writeFile(target, data, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
};

export default async function store(data, folder, options) {
  let source;
  let metadata;

  try {
    source = sharp(data, { failOn: "error" });
    metadata = await source.metadata();
  } catch {
    return null;
  }

  const extension = extensions[metadata.format];

  if (!extension) {
    return null;
  }

  const { quality, ...resize } = options;
  const resized = await source
    .clone()
    .rotate()
    .resize({ ...resize, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  const originalName = `${hash(32, data)}.${extension}`;
  const resizingName = `${hash(32, resized)}.webp`;
  const root = path.join(
    import.meta.dirname,
    "../data/upload",
    folder
  );
  const original = path.join(root, "original");
  const resizing = path.join(root, "resizing");

  await Promise.all([
    mkdir(original, { recursive: true }),
    mkdir(resizing, { recursive: true })
  ]);

  await Promise.all([
    save(path.join(original, originalName), data),
    save(path.join(resizing, resizingName), resized)
  ]);

  return {
    original: `/upload/${folder}/original/${originalName}`,
    resizing: `/upload/${folder}/resizing/${resizingName}`
  };
}
