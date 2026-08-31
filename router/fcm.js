import { Router } from "express";

import { enabled } from "#config/fcm";
import address from "#config/ip";
import { get, run } from "#config/sqlite";
import uid from "#config/uid";

import string from "#src/string";

import limit from "#middleware/limit";

const devices = new Set(["android", "ios", "wearable"]);
const router = Router();
const allowed = limit(20);

router.post("/", async (req, res) => {
  if (!enabled) {
    return res.status(503).end();
  }

  const fid = string(req.body.fid).trim();
  const device = string(req.body.device)
    .trim()
    .toLowerCase();

  if (!fid || fid.length > 4096 || !devices.has(device)) {
    return res.status(400).end();
  }

  const id = uid(req);
  const ip = address(req);

  if (!allowed(ip)) {
    res.set("Retry-After", "60");

    return res.status(429).end();
  }

  const user = id
    ? await get(
        `
        SELECT uid
        FROM user
        WHERE uid = ?
      `,
        [id]
      )
    : null;
  const blocked = await get(
    `
    SELECT 1
    FROM block
    WHERE uid = ?
      OR ip = ?
    LIMIT 1
  `,
    [id || null, ip]
  );

  if (!user || blocked) {
    return res.status(403).end();
  }

  await run(
    `
    INSERT INTO fcm (
      uid,
      fid,
      device
    )
    VALUES (?, ?, ?)
    ON CONFLICT(fid) DO UPDATE SET
      uid = excluded.uid,
      device = excluded.device,
      time = datetime('now', '+9 hours')
  `,
    [id, fid, device]
  );
  res.status(204).end();
});

router.delete("/", async (req, res) => {
  const id = uid(req);
  const fid = req.body?.fid;

  if (!id || typeof fid !== "string") {
    return res.status(400).end();
  }

  await run(
    `
    DELETE FROM fcm
    WHERE uid = ?
      AND fid = ?
  `,
    [id, fid]
  );
  res.status(204).end();
});

export default router;
