import { Router } from "express";

import webpush, { enabled } from "#config/push";
import { all, run } from "#config/sqlite";
import admin from "#middleware/admin";

const router = Router();

router.use(admin);

router.get("/", (req, res) => {
  res.status(204).end();
});

router.post("/", async (req, res) => {
  if (!enabled) {
    return res.status(503).end();
  }

  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";

  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";

  const value = typeof req.body.url === "string" ? req.body.url.trim() : "";

  const url = value.startsWith("/") && !value.startsWith("//") ? value : "/";

  if (!title) {
    return res.status(400).end();
  }

  const rows = await all("SELECT endpoint, data FROM push");

  let sent = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          JSON.parse(row.data),
          JSON.stringify({ title, body, url }),
          { TTL: 300 }
        );

        sent += 1;
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) {
          await run("DELETE FROM push WHERE endpoint = ?", [row.endpoint]);

          return;
        }

        failed += 1;
      }
    })
  );

  res.json({ sent, failed });
});

export default router;
