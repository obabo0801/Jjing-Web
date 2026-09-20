import { Router } from "express";
import { randomBytes } from "node:crypto";

import { get, run } from "#db";
import identity from "#config/uid";
import * as media from "#config/media";
import * as profile from "#service/profile/data";
import * as consent from "#shared/consent";
import string from "#shared/string";
import * as events from "#service/events";
import account from "#middleware/account";

const router = Router();

const valid = (value) => /^[\p{L}\p{N} _-]{2,20}$/u.test(value);

router.get("/name", account, async (req, res) => {
  const uid = identity(req);
  const name = string(req.query.name).trim();

  if (!uid) {
    return res.status(403).end();
  }

  if (!valid(name)) {
    return res.json({ available: false });
  }

  await profile.clear();

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
      FROM user
      WHERE json_extract(draft, '$.name') = ? COLLATE NOCASE
        AND uid <> ?
    )
  `,
    [name, uid, name, uid]
  );

  res.json({ available: !used });
});

router.patch("/", account, async (req, res) => {
  const uid = identity(req);
  const name = string(req.body?.name).trim();
  const current = await profile.find(uid);
  const email = current?.email || "";

  if (!uid) {
    return res.status(403).end();
  }

  if (name !== current.name && !valid(name)) {
    return res.status(400).end();
  }

  if (
    name !== current.name &&
    current.renamed &&
    Date.now() - Date.parse(`${current.renamed.replace(" ", "T")}+09:00`) < 86400000
  )
    return res.status(429).end();

  if (!current.setup && !consent.valid(req.body?.consent)) {
    return res.status(412).end();
  }

  await profile.clear();

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

  const token = randomBytes(24).toString("base64url");

  try {
    result = await run(
      `
      UPDATE user SET draft = json_object(
        'name', ?, 'email', ?, 'token', ?, 'time', datetime('now', '+9 hours')
      )
      WHERE uid = ? AND NOT EXISTS (
        SELECT 1 FROM user AS other
        WHERE other.uid <> user.uid AND (
          other.name = ? COLLATE NOCASE
          OR json_extract(other.draft, '$.name') = ? COLLATE NOCASE
        )
      )
    `,
      [name, email, token, uid, name, name]
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

  const user = await profile.find(uid);

  res.json({ token, name, email, avatar: media.resolve(user.avatar) });
});

router.post("/complete", account, async (req, res) => {
  const uid = identity(req);
  const image = req.body?.image === null ? "clear" : (req.body?.image ?? "keep");
  const token = string(req.body?.token);

  if (!uid) {
    return res.status(403).end();
  }

  const current = await profile.find(uid);

  if (!current.setup && !consent.valid(req.body?.consent)) {
    return res.status(412).end();
  }

  if (!["keep", "clear", "draft"].includes(image)) {
    return res.status(400).end();
  }

  await profile.clear();

  let result;

  try {
    result = await run(
      `
      UPDATE user
      SET
        renamed = CASE WHEN name IS NOT json_extract(draft, '$.name')
          THEN datetime('now', '+9 hours') ELSE renamed END,
        name = json_extract(draft, '$.name'),
        email = json_extract(draft, '$.email'),
        image = CASE ?
          WHEN 'clear' THEN NULL
          WHEN 'draft' THEN json_extract(draft, '$.image')
          ELSE image
        END,
        avatar = CASE ?
          WHEN 'clear' THEN NULL
          WHEN 'draft' THEN json_extract(draft, '$.avatar')
          ELSE avatar
        END,
        setup = 1,
        consent = CASE WHEN setup = 1 THEN consent ELSE ? END,
        draft = NULL
      WHERE uid = ? AND draft IS NOT NULL
        AND json_extract(draft, '$.token') = ?
        AND (name IS json_extract(draft, '$.name') OR renamed IS NULL
          OR renamed <= datetime('now', '+9 hours', '-24 hours'))
        AND (? <> 'draft' OR (
          json_extract(draft, '$.image') IS NOT NULL
          AND json_extract(draft, '$.avatar') IS NOT NULL
        ))
    `,
      [
        image,
        image,
        JSON.stringify({
          terms: consent.terms,
          privacy: consent.privacy,
          time: new Date().toISOString()
        }),
        uid,
        token,
        image
      ]
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

  events.broadcast("online");

  const user = await profile.find(uid);

  events.broadcast("profile-update", { id: user.id });

  res.json({
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    image: media.resolve(user.image),
    avatar: media.resolve(user.avatar),
    renamed: user.renamed || "",
    setup: Boolean(user.setup)
  });
});

export default router;
