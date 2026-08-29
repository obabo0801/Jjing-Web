import express, { Router } from "express";

import address from "#config/ip";
import { now } from "#config/log";
import record from "#config/log/stt";
import recognize, { enabled } from "#config/speech";
import { get } from "#config/sqlite";
import save, { supported } from "#config/stt";
import uid from "#config/uid";

import limit from "#middleware/limit";

const router = Router();

const allowed = limit(20);

const raw = express.raw({ type: "audio/*", limit: "5mb" });

const decode = (req) => {
  try {
    const value = req.get("x-stt-meta");

    if (!value) {
      return null;
    }

    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  } catch {
    return null;
  }
};

const tooLong = (text) => [...text].length > 500;
router.get("/", (_, res) => {
  res.json({ cloud: enabled });
});
router.post("/", raw, async (req, res) => {
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

  const blocked = user
    ? await get(
        `
        SELECT 1
        FROM block
        WHERE uid = ?
          OR ip = ?
        LIMIT 1
      `,
        [id, ip]
      )
    : null;

  if (!user || blocked) {
    return res.status(403).end();
  }

  const audio = Buffer.isBuffer(req.body);
  const data = audio ? decode(req) : req.body;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).end();
  }

  let text = typeof data.text === "string" ? data.text.trim() : "";

  const lang = typeof data.lang === "string" ? data.lang.trim() : "";

  const pitch = ["low", "mid", "high", "unknown"].includes(data.pitch)
    ? data.pitch
    : "unknown";

  let type = text ? "browser" : "cloud";

  if (tooLong(text)) {
    return res.status(400).end();
  }

  if (!audio) {
    if (!text) {
      return res.status(204).end();
    }

    const time = now();
    await record(id, lang, text, "unknown", "browser", time);

    return res.status(204).end();
  }

  const mime = req.get("content-type")?.split(";")[0].toLowerCase();

  if (!supported(mime)) {
    return res.status(415).end();
  }

  let confidence = null;

  if (enabled) {
    try {
      const result = await recognize(req.body, lang);

      if (result.text) {
        text = result.text;
        confidence = result.confidence;
        type = "cloud";
      }
    } catch {
      if (!text) {
        return res.status(502).end();
      }
    }
  }

  if (!text) {
    return res.status(204).end();
  }

  if (tooLong(text)) {
    return res.status(400).end();
  }

  const time = now();

  let file;

  try {
    file = await save(req.body, mime, id, text, time);
  } catch (error) {
    if (error?.code === "SQLITE_BUSY") {
      throw error;
    }

    return res.status(500).end();
  }

  if (!file) {
    return res.status(415).end();
  }

  await record(id, lang, text, pitch, type, time);

  return res.json({ text, confidence });
});

export default router;
