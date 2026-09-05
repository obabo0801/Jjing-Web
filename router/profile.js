import { raw, Router } from "express";

import * as events from "#config/events";
import store, { transform } from "#config/image";
import * as profile from "#config/profile";
import recent from "#config/log/recent";
import { get, run } from "#config/sqlite";
import identity from "#config/uid";
import limit from "#config/upload";

import string from "#src/string";

import admin from "#middleware/admin";

const router = Router();

const upload = raw({
  type: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ],
  limit
});

const imageEdit = (request) => {
  const value = request.get("x-image-edit");

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const validName = (value) =>
  /^[\p{L}\p{N} _-]{2,20}$/u.test(value);

const validEmail = (value) =>
  !value ||
  (value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const clear = () =>
  run(`
    DELETE FROM draft
    WHERE time < datetime('now', '+9 hours', '-15 minutes')
  `);

const find = (uid) =>
  get(
    `
    SELECT
      rowid AS number,
      uid,
      name,
      email,
      image,
      avatar,
      setup,
      role,
      ip,
      date
    FROM user
    WHERE uid = ?
  `,
    [uid]
  );

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

router.get("/name", async (req, res) => {
  const uid = identity(req);
  const name = string(req.query.name).trim();

  if (!uid) {
    return res.status(403).end();
  }

  if (!validName(name)) {
    return res.json({ available: false });
  }

  await clear();

  const used = await get(
    `
    SELECT 1
    WHERE EXISTS (
      SELECT 1
      FROM user
      WHERE name = ? COLLATE NOCASE
        AND uid <> ?
    ) OR EXISTS (
      SELECT 1
      FROM draft
      WHERE name = ? COLLATE NOCASE
        AND uid <> ?
    )
  `,
    [name, uid, name, uid]
  );

  res.json({ available: !used });
});

router.patch("/", async (req, res) => {
  const uid = identity(req);
  const name = string(req.body?.name).trim();
  const email = string(req.body?.email).trim();

  if (!uid) {
    return res.status(403).end();
  }

  if (!validName(name) || !validEmail(email)) {
    return res.status(400).end();
  }

  await clear();

  const used = await get(
    `
    SELECT 1
    FROM user
    WHERE name = ? COLLATE NOCASE
      AND uid <> ?
  `,
    [name, uid]
  );

  if (used) {
    return res.status(409).end();
  }

  let result;

  try {
    result = await run(
      `
      INSERT INTO draft (uid, name, email, time)
      VALUES (?, ?, ?, datetime('now', '+9 hours'))
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        time = excluded.time
    `,
      [uid, name, email]
    );
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") {
      return res.status(409).end();
    }

    throw error;
  }

  if (!result.changes) {
    return res.status(409).end();
  }

  const user = await find(uid);

  res.json({
    name,
    email,
    number: user.number,
    avatar: user.avatar || ""
  });
});

router.post("/complete", async (req, res) => {
  const uid = identity(req);

  if (!uid) {
    return res.status(403).end();
  }

  await clear();

  let result;

  try {
    result = await run(
      `
      WITH profile AS (
        SELECT name, email, image, avatar
        FROM draft
        WHERE uid = ?
      )
      UPDATE user
      SET
        name = (SELECT name FROM profile),
        email = (SELECT email FROM profile),
        image = COALESCE(
          (SELECT image FROM profile),
          image
        ),
        avatar = COALESCE(
          (SELECT avatar FROM profile),
          avatar
        ),
        setup = 1
      WHERE uid = ?
        AND EXISTS (SELECT 1 FROM profile)
    `,
      [uid, uid]
    );
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") {
      return res.status(409).end();
    }

    throw error;
  }

  if (!result.changes) {
    return res.status(409).end();
  }

  await run("DELETE FROM draft WHERE uid = ?", [uid]);

  res.status(204).end();
});

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

  const image = await saveImage(
    uid,
    req.body,
    imageEdit(req)
  );

  if (!image) {
    return res.status(415).end();
  }

  res.json({
    image: image.original,
    avatar: image.resizing
  });
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

  const draft = await get(
    "SELECT 1 FROM draft WHERE uid = ?",
    [uid]
  );

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

  res.set({
    "Content-Type": item.type,
    "Cache-Control": "no-store"
  });

  res.send(item.file);
});

router.post("/image/link", async (req, res) => {
  const uid = identity(req);

  if (!uid) {
    return res.status(403).end();
  }

  const value = profile.create(uid);

  res.json({ token: value });
});

router.post(
  "/image/link/:token",
  upload,
  async (req, res) => {
    const value = string(req.params.token).trim();

    const item = profile.get(value);

    if (!item) {
      return res.status(404).end();
    }

    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).end();
    }

    const edit = imageEdit(req);

    let file;

    try {
      file = edit
        ? await transform(req.body, edit, 85)
        : Buffer.from(req.body);
    } catch {
      file = null;
    }

    if (!file) {
      return res.status(415).end();
    }

    item.file = file;
    item.type = edit
      ? "image/webp"
      : req.get("content-type");

    profile.refresh(item);

    events.send(item.uid, "profile-image", {
      token: value
    });

    res.status(204).end();
  }
);

router.get("/:uid", async (req, res) => {
  const viewer = await find(identity(req));

  if (!viewer) {
    return res.status(403).end();
  }

  const uid =
    req.params.uid === "me"
      ? viewer.uid
      : string(req.params.uid).trim();
  const user = uid ? await find(uid) : null;

  if (!user) {
    return res.status(404).end();
  }

  const access = await recent(user.uid);
  const self = viewer.uid === user.uid;
  const manage =
    viewer.role === 0 && user.role !== 0 && !self;

  const result = {
    uid: user.uid,
    short: user.uid.slice(0, 8),
    name: user.name || "",
    image: user.image || "",
    avatar: user.avatar || "",
    number: user.number,
    setup: Boolean(user.setup),
    self,
    state: events.state(user.uid),
    last: access?.time || user.date,
    manage
  };

  if (manage) {
    result.details = {
      uid: user.uid,
      email: user.email || "",
      userIp: user.ip,
      accessIp: access?.ip || "",
      date: user.date,
      os: access?.os || ""
    };
  }

  res.json(result);
});

router.post("/:uid/block", admin, async (req, res) => {
  const reason = string(req.body?.reason).trim();

  if (!reason || reason.length > 500) {
    return res.status(400).end();
  }

  const user = await find(string(req.params.uid).trim());

  if (!user) {
    return res.status(404).end();
  }

  if (user.uid === req.user.uid || user.role === 0) {
    return res.status(403).end();
  }

  await run(
    `
    INSERT INTO block (uid, ip, reason)
    SELECT ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1
      FROM block
      WHERE uid = ?
        OR ip = ?
    )
  `,
    [user.uid, user.ip, reason, user.uid, user.ip]
  );

  events.send(user.uid, "block");
  events.broadcast("chatting-block", { uid: user.uid });
  res.status(204).end();
});

export default router;
