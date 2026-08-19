import express, { Router } from "express";

import { get } from "#config/sqlite";
import address from "#config/ip";
import uid from "#config/uid";
import record from "#config/log/stt";
import save, { supported } from "#config/stt";
import recognize, { enabled } from "#config/speech";
import limit from "#middleware/limit";

const router = Router();

const allowed = limit(20);

const raw = express.raw({ type: "audio/*", limit: "5mb" });

const now = () =>
  new Date(Date.now() + 32_400_000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

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

router.get("/", (req, res) => res.json({ cloud: enabled }));

router.post("/", raw, async (req, res) => {
  const id = uid(req);
  const ip = address(req);

  const user = id
    ? await get("SELECT uid FROM user WHERE uid = ?", [id])
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

  if (!allowed(ip)) {
    res.set("Retry-After", "60");

    return res.status(429).end();
  }

  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).end();
  }

  const data = decode(req);

  if (!data) {
    return res.status(400).end();
  }

  let text = typeof data.text === "string" ? data.text.trim() : "";

  const lang = typeof data.lang === "string" ? data.lang.trim() : "";

  const pitch = ["low", "mid", "high", "unknown"].includes(data.pitch)
    ? data.pitch
    : "unknown";

  let type = text ? "browser" : "cloud";

  if (!lang || [...text].length > 500) {
    return res.status(400).end();
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

  if (!text || [...text].length > 500) {
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
