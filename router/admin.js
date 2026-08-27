import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { raw, Router } from "express";

import record from "#config/log/notification";
import webpush, { enabled } from "#config/push";
import { all, run } from "#config/sqlite";

import admin from "#middleware/admin";

const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const images = path.join(
  import.meta.dirname,
  "../upload/images"
);

const parseImage = raw({
  type: Object.keys(extensions),
  limit: "5mb"
});

const router = Router();

router.use(admin);

router.get("/", (_, res) => {
  res.status(204).end();
});

router.post("/image", parseImage, async (req, res) => {
  const type = req
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  const extension = extensions[type];

  if (!extension) {
    return res.status(415).end();
  }

  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).end();
  }

  await mkdir(images, { recursive: true });

  const name = `${randomUUID()}.${extension}`;

  await writeFile(path.join(images, name), req.body, {
    flag: "wx"
  });

  return res.json({ image: `/upload/images/${name}` });
});

router.post("/", async (req, res) => {
  if (!enabled) {
    return res.status(503).end();
  }

  const title =
    typeof req.body.title === "string"
      ? req.body.title.trim()
      : "";

  const body =
    typeof req.body.body === "string"
      ? req.body.body.trim()
      : "";

  const link =
    typeof req.body.url === "string"
      ? req.body.url.trim()
      : "";

  const image =
    typeof req.body.image === "string"
      ? req.body.image.trim()
      : "";

  const url =
    link.startsWith("/") &&
    !link.startsWith("//") &&
    !link.includes("\\")
      ? link
      : "/";

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
          JSON.stringify({ title, body, image, url }),
          { TTL: 300 }
        );

        sent += 1;
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) {
          await run(
            `
            DELETE FROM push
            WHERE endpoint = ?
          `,
            [row.endpoint]
          );

          return;
        }

        failed += 1;
      }
    })
  );

  await record(req.user.uid, title, body, image, url);

  res.json({ sent, failed });
});

export default router;
