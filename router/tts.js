import { Router } from "express";

import { get } from "#config/sqlite";
import address from "#config/ip";
import uid from "#config/uid";
import record from "#config/log/tts";
import synthesize from "#config/tts";
import limit from "#middleware/limit";

const router = Router();

const allowed = limit(20);

const now = () =>
  new Date(Date.now() + 32_400_000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

router.post("/", async (req, res) => {
  const id = uid(req);
  const ip = address(req);

  const user = id
    ? await get(
        "SELECT uid FROM user WHERE uid = ?",
        [id]
      )
    : null;

  const blocked = user
    ? await get(`
        SELECT 1
        FROM block
        WHERE uid = ?
          OR ip = ?
        LIMIT 1
      `, [id, ip])
    : null;

  if (!user || blocked) {
    return res.status(403).end();
  }

  if (!allowed(ip)) {
    res.set("Retry-After", "60");

    return res.status(429).end();
  }

  const text = typeof req.body.text === "string"
    ? req.body.text.trim()
    : "";

  if (!text) {
    return res.status(400).end();
  }

  if ([...text].length > 500) {
    return res.status(413).end();
  }

  const time = now();

  let result;

  try {
    result = await synthesize({
      text,
      lang: req.body.lang,
      pitch: req.body.pitch,
      rate: req.body.rate,
      voice: req.body.voice
    }, id, time);
  } catch {
    return res.status(502).end();
  }

  await record(
    id, text, result.provider, time
  );

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
