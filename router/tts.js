import { Router } from "express";

import address from "#config/ip";
import { now } from "#config/log";
import record from "#config/log/tts";
import { get } from "#config/sqlite";
import synthesize from "#config/tts";
import uid from "#config/uid";

import limit from "#middleware/limit";

const router = Router();

const allowed = limit(20);
router.post("/", async (req, res) => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).end();
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return res.status(400).end();
  }

  if ([...text].length > 500) {
    return res.status(413).end();
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

  const only = body.type === "cache";

  if (!only && (!user || blocked)) {
    return res.status(403).end();
  }

  if (body.type === "browser") {
    const voice = typeof body.voice === "string" ? body.voice.trim() : "";

    if ([...voice].length > 200) {
      return res.status(400).end();
    }

    await record(id, text, voice || "default", "browser", now());

    return res.status(204).end();
  }

  const time = now();

  let result;

  try {
    result = await synthesize(
      {
        text,
        lang: body.lang,
        pitch: body.pitch,
        rate: body.rate,
        voice: body.voice
      },
      id,
      time,
      body.type
    );
  } catch (error) {
    if (error?.code === "SQLITE_BUSY") {
      throw error;
    }

    return res.status(502).end();
  }

  if (!result) {
    return body.type === "cache"
      ? res.status(204).end()
      : res.status(503).end();
  }

  if (body.type !== "cache") {
    const type = result.cached ? "cache" : result.provider;
    await record(id, text, result.voice, type, time);
  }

  res.set({
    "Cache-Control": "private, no-store",
    "Content-Type": "audio/mpeg",
    "X-Content-Type-Options": "nosniff",
    "X-TTS-Provider": result.provider,
    "X-TTS-Cache": result.cached ? "hit" : "miss"
  });

  return res.send(result.audio);
});

export default router;
