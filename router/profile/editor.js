import { Router } from "express";

import { get, run } from "#db";
import identity from "#config/uid";
import * as media from "#config/media";
import { clear, find } from "#service/profile/data";
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

  if (!consent.valid(req.body?.consent)) {
    return res.status(412).end();
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
        image = NULL,
        avatar = NULL,
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
        image = CASE ?
          WHEN 'clear' THEN NULL
          WHEN 'draft' THEN (SELECT image FROM profile)
          ELSE image
        END,
        avatar = CASE ?
          WHEN 'clear' THEN NULL
          WHEN 'draft' THEN (SELECT avatar FROM profile)
          ELSE avatar
        END,
        setup = 1,
        consent = ?
      WHERE uid = ?
        AND EXISTS (SELECT 1 FROM profile)
        AND (? <> 'draft' OR EXISTS (
          SELECT 1 FROM profile WHERE image IS NOT NULL AND avatar IS NOT NULL
        ))
    `,
      [
        uid,
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

  await run("DELETE FROM draft WHERE uid = ?", [uid]);
  events.broadcast("online");

  res.status(204).end();
});

export default router;
