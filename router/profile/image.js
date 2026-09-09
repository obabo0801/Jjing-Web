import { raw, Router } from "express";

import { get, run } from "#db";
import identity from "#config/uid";
import * as events from "#service/events";
import store, { transform } from "#service/image";
import * as profile from "#service/profile";
import { clear, find } from "#service/profile/data";
import rate from "#middleware/limit";
import max from "#shared/upload";
import string from "#shared/string";

const router = Router();

const upload = raw({
  type: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  limit: max
});

const links = rate(10);

const readEdit = (req) => {
  try {
    return JSON.parse(req.get("x-image-edit") || "null");
  } catch {
    return null;
  }
};

const saveImage = async (uid, body, edit = null) => {
  const image = await store(body, "users", {
    width: 256,
    height: 256,
    fit: "cover",
    quality: 85,
    edit
  });

  if (!image) {
    return null;
  }

  await run(
    `
    UPDATE draft
    SET
      image = ?,
      avatar = ?,
      time = datetime('now', '+9 hours')
    WHERE uid = ?
  `,
    [image.original, image.resizing, uid]
  );

  return image;
};

router.post("/image", upload, async (req, res) => {
  const uid = identity(req);
  const user = uid ? await find(uid) : null;

  await clear();

  const draft = uid
    ? await get(
        `
          SELECT 1
          FROM draft
          WHERE uid = ?
          `,
        [uid]
      )
    : null;

  if (!user || !draft) {
    return res.status(403).end();
  }

  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).end();
  }

  const image = await saveImage(uid, req.body, readEdit(req));

  if (!image) {
    return res.status(415).end();
  }

  res.json({ image: image.original, avatar: image.resizing });
});

router.post("/image/link/:token/use", async (req, res) => {
  const uid = identity(req);
  const value = string(req.params.token).trim();
  const item = profile.get(value);

  if (!uid || !item || item.uid !== uid) {
    profile.remove(value);
    return res.status(404).end();
  }

  if (!item.file) {
    return res.status(409).end();
  }

  const draft = await get("SELECT 1 FROM draft WHERE uid = ?", [uid]);

  if (!draft) {
    return res.status(409).end();
  }

  const image = await saveImage(uid, item.file);

  if (!image) {
    return res.status(415).end();
  }

  profile.remove(value);
  res.status(204).end();
});

router.get("/image/link/:token", (req, res) => {
  const uid = identity(req);
  const value = string(req.params.token).trim();
  const item = profile.get(value);

  if (!uid || !item || item.uid !== uid || !item.file) {
    return res.status(404).end();
  }

  res.set({ "Content-Type": item.type, "Cache-Control": "no-store" });

  res.send(item.file);
});

router.post("/image/link", async (req, res) => {
  const uid = identity(req);

  if (!uid) {
    return res.status(403).end();
  }

  if (!links(uid)) {
    res.set("Retry-After", "60");

    return res.status(429).end();
  }

  const value = profile.create(uid);

  res.json({ token: value });
});

router.post("/image/link/:token", upload, async (req, res) => {
  const value = string(req.params.token).trim();

  const item = profile.get(value);

  if (!item) {
    return res.status(404).end();
  }

  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).end();
  }

  const edit = readEdit(req);

  let file;

  try {
    file = edit ? await transform(req.body, edit, 85) : Buffer.from(req.body);
  } catch {
    file = null;
  }

  if (!file) {
    return res.status(415).end();
  }

  item.file = file;
  item.type = edit ? "image/webp" : req.get("content-type");

  profile.refresh(item);

  events.send(item.uid, "profile-image", { token: value });

  res.status(204).end();
});

export default router;
