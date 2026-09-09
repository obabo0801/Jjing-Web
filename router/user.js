import { randomUUID } from "node:crypto";

import { Router } from "express";

import * as role from "#shared/role";
import client from "#config/client";
import address from "#config/ip";
import access from "#service/log/access";
import { usage } from "#shared/route";
import { get, run } from "#db";
import identity, { key } from "#config/uid";

import string from "#shared/string";

import limit from "#middleware/limit";

const router = Router();
const allowed = limit(120);
const cookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  signed: true,
  maxAge: 365 * 24 * 60 * 60 * 1000
};

const clear = {
  httpOnly: cookie.httpOnly,
  sameSite: cookie.sameSite,
  secure: cookie.secure,
  path: "/"
};

const remember = (res, uid) => {
  if (uid) {
    res.cookie(key, uid, cookie);
  }
};

const status = (value) => {
  const code = Number(value);

  return Number.isInteger(code) && code >= 100 && code <= 599 ? code : 0;
};

router.get(usage, (req, res) => {
  const size = Buffer.byteLength(req.get("cookie") || "", "utf8");

  res.json({ size });
});

router.delete("/", (_, res) => {
  res.clearCookie(key, clear);
  res.status(204).end();
});

router.get("/", async (req, res) => {
  const uid = identity(req);
  const ip = address(req);
  const name = string(req.query.name);
  const path = string(req.query.path, "/").slice(0, 2048);
  const result = status(req.query.result);
  const { os, browser } = client(req);
  const user = uid
    ? await get(
        `
        SELECT uid
        FROM user
        WHERE uid = ?
      `,
        [uid]
      )
    : null;
  const recent = req.query.recent === "true";

  if (!recent) {
    if (user) {
      await access(uid, ip, os, browser, path, result);
    } else if (name) {
      await access(name, ip, os, browser, path, result);
    }
  }

  res.json({ valid: Boolean(user) });
});

router.post("/", async (req, res) => {
  let uid = identity(req);

  const path = string(req.body?.path, "/").slice(0, 2048);
  const result = status(req.body?.result);
  const ip = address(req);

  if (!allowed(ip)) {
    res.set("Retry-After", "60");

    return res.status(429).end();
  }

  const { os, browser, lang } = client(req);

  const user = uid
    ? await get(
        `
        SELECT uid, role, ip, lang
        FROM user
        WHERE uid = ?
      `,
        [uid]
      )
    : null;

  const blocked = await get(
    `
    SELECT
      rowid AS id,
      reason,
      time
    FROM block
    WHERE uid = ?
      OR ip = ?
    ORDER BY time DESC
    LIMIT 1
  `,
    [uid || null, ip]
  );

  if (blocked) {
    remember(res, uid);

    const first = await run(
      `
      UPDATE block
      SET log = 1
      WHERE rowid = ?
        AND log = 0
      `,
      [blocked.id]
    );

    if (first.changes) {
      await access(uid || null, ip, os, browser, path, result);
    }

    const data = { reason: blocked.reason, time: blocked.time };

    return res.status(403).json(data);
  }

  if (!user) {
    uid = randomUUID();
    await run(
      `
      INSERT INTO user (uid, role, ip, initial, lang)
      VALUES (?, ?, ?, ?, ?)
    `,
      [uid, role.user, ip, ip, lang]
    );
  } else if (user.ip !== ip || user.lang !== lang) {
    await run(
      `
    UPDATE user
    SET
      ip = ?,
      lang = ?
    WHERE uid = ?
    `,
      [ip, lang, uid]
    );
  }

  remember(res, uid);
  res.json({ uid });
});

export default router;
