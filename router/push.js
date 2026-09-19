import { Router } from "express";
import { randomBytes } from "node:crypto";

import address from "#config/ip";
import { enabled, key } from "#service/push";
import * as db from "#db";
import client from "#config/client";
import uid from "#config/uid";

import limit from "#middleware/limit";

const router = Router();
const allowed = limit(20);
const { get, run } = db;

router.use((req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  if (
    req.method !== "GET" &&
    (req.get("sec-fetch-site") === "cross-site" || !req.is("application/json"))
  )
    return res.status(403).end();

  next();
});

router.get("/devices", async (req, res) => {
  const id = uid(req);

  if (!id) return res.status(401).end();
  const rows = await db.all(
    `SELECT id, name, device, os, browser, active, connected
      FROM web WHERE uid = ? ORDER BY time DESC`,
    [id]
  );

  res.json(
    rows.map((row) => ({ ...row, active: Boolean(row.active), connected: Boolean(row.connected) }))
  );
});

router.patch("/devices/:id", async (req, res) => {
  const entries = Object.entries(req.body || {});

  if (
    !entries.length ||
    entries.some(([key, value]) =>
      key === "name"
        ? typeof value !== "string" || !value.trim() || value.trim().length > 60
        : !["active", "connected"].includes(key) || typeof value !== "boolean"
    )
  )
    return res.status(400).end();
  const values = entries.map(([key, value]) => (key === "name" ? value.trim() : Number(value)));

  const row = await get(
    `UPDATE web SET ${entries.map(([key]) => `${key} = ?`).join(", ")}
      WHERE uid = ? AND id = ? RETURNING id`,
    [...values, uid(req), req.params.id]
  );

  if (!row) return res.status(404).end();

  res.status(204).end();
});

router.delete("/devices/:id", async (req, res) => {
  const result = await run("DELETE FROM web WHERE uid = ? AND id = ?", [uid(req), req.params.id]);

  res.status(result.changes ? 204 : 404).end();
});

router.get("/", async (req, res) => {
  if (!enabled) {
    return res.status(503).end();
  }

  const id = uid(req);

  const saved = id
    ? await get(
        `
        SELECT 1
        FROM web
        WHERE uid = ?
        LIMIT 1
      `,
        [id]
      )
    : null;

  res.json({ key, subscribed: Boolean(saved) });
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

  const info = client(req);
  const result = await run(
    `
      UPDATE web
      SET
        data = ?,
        os = ?,
        browser = ?,
        time = datetime('now', '+9 hours')
      WHERE uid = ?
        AND endpoint = ?
    `,
    [JSON.stringify(subscription), info.os, info.browser, id, endpoint]
  );

  if (!result.changes) {
    return res.status(404).end();
  }

  const row = await get("SELECT id, active, connected FROM web WHERE uid = ? AND endpoint = ?", [
    id,
    endpoint
  ]);

  return res.json({ id: row.id, active: Boolean(row.active), connected: Boolean(row.connected) });
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

  const info = client(req);
  const result = await run(
    `
    INSERT INTO web (
      uid,
      id,
      device,
      os,
      browser,
      endpoint,
      data
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      data = excluded.data,
      os = excluded.os,
      browser = excluded.browser,
      time = datetime('now', '+9 hours')
    WHERE web.uid = excluded.uid
  `,
    [
      id,
      randomBytes(16).toString("hex"),
      ["wearable", "mobile", "desktop"].includes(req.body.device)
        ? req.body.device
        : info.os === "Wearable"
          ? "wearable"
          : ["Android", "iOS"].includes(info.os)
            ? "mobile"
            : "desktop",
      info.os,
      info.browser,
      endpoint,
      JSON.stringify(subscription)
    ]
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
