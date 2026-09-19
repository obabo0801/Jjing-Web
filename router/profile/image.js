import { raw, Router } from "express";

import { get, run } from "#db";
import identity from "#config/uid";
import * as events from "#service/events";
import store, { transform } from "#service/image";
import * as profile from "#service/profile";
import * as data from "#service/profile/data";
import rate from "#middleware/limit";
import max from "#shared/upload";
import string from "#shared/string";
import account from "#middleware/account";

const router = Router();

const upload = raw({ type: ["image/jpeg", "image/png", "image/webp", "image/gif"], limit: max });

const links = rate(10);

const readEdit = (req) => {
  try {
    return JSON.parse(req.get("x-image-edit") || "null");
  } catch {
    return null;
  }
};

const saveImage = async (uid, body, edit = null, token = "") => {
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

  for (const file of [image.original, image.resizing])
    await run("INSERT OR IGNORE INTO profile_file VALUES (?, ?)", [uid, file]);

  const result = await run(
    `
    UPDATE user SET draft = json_set(
      draft, '$.image', ?, '$.avatar', ?,
      '$.time', datetime('now', '+9 hours')
    )
    WHERE uid = ? AND draft IS NOT NULL AND deletion IS NULL AND erased = 0
      AND json_extract(draft, '$.token') = ?
      AND json_extract(draft, '$.time')
        >= datetime('now', '+9 hours', '-15 minutes')
  `,
    [image.original, image.resizing, uid, token]
  );

  return result.changes ? image : null;
};

router.post("/image", account, upload, async (req, res) => {
  const uid = identity(req);
  const user = uid ? await data.find(uid) : null;

  await data.clear();

  const draft = uid
    ? await get(
        `
          SELECT 1
          FROM user
          WHERE uid = ? AND draft IS NOT NULL
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

  const image = await saveImage(uid, req.body, readEdit(req), req.get("x-profile-draft"));

  if (!image) {
    return res.status(415).end();
  }

  res.json({ image: image.original, avatar: image.resizing });
});

router.post("/image/link/:token/use", account, async (req, res) => {
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

  await data.clear();

  const draft = await get("SELECT 1 FROM user WHERE uid = ? AND draft IS NOT NULL", [uid]);

  if (!draft) {
    return res.status(409).end();
  }

  const image = await saveImage(uid, item.file, null, string(req.body?.token));

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

router.post("/image/link", account, async (req, res) => {
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
