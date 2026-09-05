import { Router } from "express";

import address from "#config/ip";
import { enabled, key } from "#config/push";
import { get, run } from "#config/sqlite";
import uid from "#config/uid";

import limit from "#middleware/limit";

const router = Router();
const allowed = limit(20);

router.get("/", (_, res) => {
  if (!enabled) {
    return res.status(503).end();
  }

  res.json({ key });
});

router.put("/", async (req, res) => {
  if (!enabled) {
    return res.status(503).end();
  }

  const id = uid(req);
  const subscription = req.body?.subscription;
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;

  if (
    typeof endpoint !== "string" ||
    typeof keys?.auth !== "string" ||
    typeof keys?.p256dh !== "string"
  ) {
    return res.status(400).end();
  }

  if (!id) {
    return res.status(401).end();
  }

  const result = await run(
    `
      UPDATE web
      SET
        data = ?,
        time = datetime('now', '+9 hours')
      WHERE uid = ?
        AND endpoint = ?
    `,
    [JSON.stringify(subscription), id, endpoint]
  );

  if (!result.changes) {
    return res.status(404).end();
  }

  return res.status(204).end();
});

router.post("/", async (req, res) => {
  if (!enabled) {
    return res.status(503).end();
  }

  const subscription = req.body?.subscription;
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;

  if (
    typeof endpoint !== "string" ||
    typeof keys?.auth !== "string" ||
    typeof keys?.p256dh !== "string"
  ) {
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

  const result = await run(
    `
    INSERT INTO web (
      uid,
      endpoint,
      data
    )
    VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      data = excluded.data,
      time = datetime('now', '+9 hours')
    WHERE web.uid = excluded.uid
  `,
    [id, endpoint, JSON.stringify(subscription)]
  );

  if (!result.changes) {
    return res.status(409).end();
  }

  res.status(204).end();
});

router.delete("/", async (req, res) => {
  const id = uid(req);
  const endpoint = req.body?.endpoint;

  if (!id || typeof endpoint !== "string") {
    return res.status(400).end();
  }

  await run(
    `
    DELETE FROM web
    WHERE uid = ?
      AND endpoint = ?
  `,
    [id, endpoint]
  );
  res.status(204).end();
});

export default router;
