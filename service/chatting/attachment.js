import { randomUUID } from "node:crypto";
import sharp from "sharp";
import store from "#service/image";
import { maxPixels } from "#service/image/transform";
import { accept } from "#service/ogq";
import * as rules from "#shared/attachment";
import maximum from "#shared/upload";

// 경로나 MIME을 돌려받아 신뢰하지 않고, 현재 사용자의 업로드 영수증만 받습니다.
const uploads = new Map();
const mime = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif"
};

const fail = (status) => {
  throw Object.assign(new Error("Invalid attachment"), { status });
};

const clean = () => {
  for (const [key, value] of uploads)
    if (value.expires <= Date.now()) uploads.delete(key);
};

const timer = setInterval(clean, 60_000);

timer.unref();

export const upload = async (user, data, type, adjustment) => {
  if (!Buffer.isBuffer(data) || !data.length || !rules.types.includes(type))
    fail(415);
  if (data.length > maximum) fail(413);
  clean();
  if (
    uploads.size >= 1000 ||
    [...uploads.values()].filter((entry) => entry.uid === user.uid).length >= 30
  )
    fail(429);
  let metadata;

  try {
    metadata = await sharp(data, {
      animated: true,
      limitInputPixels: maxPixels,
      failOn: "error"
    }).metadata();
  } catch {
    fail(415);
  }
  if (mime[metadata.format] !== type) fail(415);
  let edit;

  if (adjustment !== undefined) {
    try {
      edit = JSON.parse(adjustment);
    } catch {
      fail(400);
    }
    if (
      !edit ||
      !["width", "height", "angle", "scale", "x", "y"].every(
        (key) => typeof edit[key] === "number" && Number.isFinite(edit[key])
      ) ||
      edit.width < (edit.shape === "original" ? 1 : 64) ||
      edit.width > 1024 ||
      edit.height < (edit.shape === "original" ? 1 : 64) ||
      edit.height > 1024 ||
      edit.scale < 1 ||
      edit.scale > 3 ||
      Math.abs(edit.x) > 1 ||
      Math.abs(edit.y) > 1 ||
      !["square", "original"].includes(edit.shape)
    )
      fail(400);
    if (edit.shape === "original") {
      const swap = metadata.orientation >= 5 && metadata.orientation <= 8;
      const width = swap ? metadata.height : metadata.width;
      const height = swap
        ? metadata.width
        : metadata.pageHeight || metadata.height;
      const ratio = Math.min(1, 1024 / Math.max(width, height));

      edit.width = Math.max(1, Math.round(width * ratio));
      edit.height = Math.max(1, Math.round(height * ratio));
    }
    edit = Object.fromEntries(
      ["width", "height", "shape", "angle", "scale", "x", "y"].map((key) => [
        key,
        edit[key]
      ])
    );
  }
  const saved = await store(data, "images", {
    width: 1280,
    height: 1280,
    fit: "inside",
    quality: 85,
    ...(edit && { edit })
  });

  if (!saved) fail(415);
  const token = randomUUID();

  const expires = Date.now() + 30 * 60_000;

  uploads.set(token, {
    uid: user.uid,
    expires,
    item: {
      type: type === "image/gif" ? "gif" : "image",
      image: saved.original,
      preview: saved.resizing,
      mime: type,
      size: data.length,
      ...(edit && { edit })
    }
  });
  return { token, expires };
};

export const resolve = async (user, items = []) => {
  if (!Array.isArray(items) || items.length > rules.maximum) fail(400);
  clean();
  const result = [];

  for (const value of items) {
    if (value?.type === "ogq") {
      const item = await accept(value);

      if (!item) fail(400);
      result.push(item);
      continue;
    }
    const entry = uploads.get(value?.token);

    if (
      !entry ||
      entry.uid !== user.uid ||
      entry.item.type !== value.type ||
      typeof value.description !== "string" ||
      value.description.length > rules.description ||
      typeof value.spoiler !== "boolean"
    )
      fail(400);
    result.push({
      ...entry.item,
      description: value.description.trim(),
      spoiler: value.spoiler
    });
  }
  return result;
};

export const consume = (user, items) => {
  for (const item of items)
    if (uploads.get(item.token)?.uid === user.uid) uploads.delete(item.token);
};

export const read = (value) => {
  try {
    const items = typeof value === "string" ? JSON.parse(value) : value;

    return rules.valid(items) ? items : [];
  } catch {
    return [];
  }
};
