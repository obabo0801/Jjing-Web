import sharp from "sharp";

import * as path from "#config/path";
import hash from "#config/hash";
import * as media from "#config/media";
import { transform, maxPixels } from "#service/image/transform";

export { transform };

const extensions = { gif: "gif", jpeg: "jpg", png: "png", webp: "webp" };

const save = async (target, data) => {
  try {
    await path.writeFile(target, data, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
};

export default async function store(data, folder, options) {
  let source;
  let metadata;
  let original = data;

  try {
    if (options.edit) {
      original = await transform(data, options.edit, options.quality);

      if (!original) {
        return null;
      }
    }

    source = sharp(original, {
      animated: true,
      failOn: "error",
      limitInputPixels: maxPixels
    });
    metadata = await source.metadata();
  } catch {
    return null;
  }

  const extension = extensions[metadata.format];

  if (!extension) {
    return null;
  }

  const { quality } = options;
  const resize = { ...options };

  delete resize.quality;
  delete resize.edit;

  const animation =
    (metadata.pages || 1) > 1
      ? {
          loop: metadata.loop ?? 0,
          ...(metadata.delay ? { delay: metadata.delay } : {})
        }
      : {};

  const resized = await source
    .clone()
    .autoOrient()
    .resize({ ...resize, withoutEnlargement: true })
    .webp({ quality, ...animation })
    .toBuffer();
  const orig = `${hash(32, original)}.${extension}`;
  const webp = `${hash(32, resized)}.webp`;
  const originals = path.upload(folder, "original");

  const resizing = path.upload(folder, "resizing");

  await Promise.all([
    path.mkdir(originals, { recursive: true }),
    path.mkdir(resizing, { recursive: true })
  ]);

  await Promise.all([
    save(path.upload(folder, "original", orig), original),
    save(path.upload(folder, "resizing", webp), resized)
  ]);

  return {
    original: media.url(folder, "original", orig),
    resizing: media.url(folder, "resizing", webp)
  };
}
