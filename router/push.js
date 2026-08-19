import { Router } from "express";

import { enabled, key } from "#config/push";
import { get, run } from "#config/sqlite";
import address from "#config/ip";
import uid from "#config/uid";
import limit from "#middleware/limit";

const router = Router();

const allowed = limit(20);

router.get("/", (req, res) => {
  if (!enabled) {
    return res.status(503).end();
  }

  res.json({ key });
});

router.post("/", async (req, res) => {
  if (!enabled) {
    return res.status(503).end();
  }

  const id = uid(req);

  const ip = address(req);

  const user = id
    ? await get("SELECT uid FROM user WHERE uid = ?", [id])
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

  if (!allowed(ip)) {
    res.set("Retry-After", "60");

    return res.status(429).end();
  }

  const subscription = req.body.subscription;
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;

  if (
    typeof endpoint !== "string" ||
    typeof keys?.auth !== "string" ||
    typeof keys?.p256dh !== "string"
  ) {
    return res.status(400).end();
  }

  await run(
    `
    INSERT INTO push (uid, endpoint, data)
    VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      uid = excluded.uid,
      data = excluded.data
  `,
    [id, endpoint, JSON.stringify(subscription)]
  );

  res.status(204).end();
});

export default router;
