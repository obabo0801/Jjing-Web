import { Router } from "express";

import { get, run } from "#db";
import identity from "#config/uid";
import * as media from "#config/media";
import * as profile from "#service/profile/data";
import * as consent from "#shared/consent";
import string from "#shared/string";
import * as events from "#service/events";

const router = Router();

const validName = (value) => /^[\p{L}\p{N} _-]{2,20}$/u.test(value);

const validEmail = (value) =>
  !value || (value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

router.get("/name", async (req, res) => {
  const uid = identity(req);
  const name = string(req.query.name).trim();

  if (!uid) {
    return res.status(403).end();
  }

  if (!validName(name)) {
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

  if (!consent.valid(req.body?.consent)) {
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

  try {
    result = await run(
      `
      UPDATE user SET draft = json_object(
        'name', ?, 'email', ?, 'time', datetime('now', '+9 hours')
      )
      WHERE uid = ? AND NOT EXISTS (
        SELECT 1 FROM user AS other
        WHERE other.uid <> user.uid AND (
          other.name = ? COLLATE NOCASE
          OR json_extract(other.draft, '$.name') = ? COLLATE NOCASE
        )
      )
    `,
      [name, email, uid, name, name]
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

  res.json({ name, email, avatar: media.resolve(user.avatar) });
});

router.post("/complete", async (req, res) => {
  const uid = identity(req);
  const image =
    req.body?.image === null ? "clear" : (req.body?.image ?? "keep");

  if (!uid) {
    return res.status(403).end();
  }

  if (!consent.valid(req.body?.consent)) {
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
        consent = ?,
        draft = NULL
      WHERE uid = ? AND draft IS NOT NULL
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

  res.status(204).end();
});

export default router;
