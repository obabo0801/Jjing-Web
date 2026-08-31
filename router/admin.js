import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { raw, Router } from "express";

import fcm, {
  enabled as fcmEnabled,
  invalid as invalidFcm
} from "#config/fcm";
import record from "#config/log/notify";
import webpush, {
  enabled as webEnabled
} from "#config/push";
import { all, run } from "#config/sqlite";

import string from "#src/string";

import admin from "#middleware/admin";

const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
const images = path.join(
  import.meta.dirname,
  "../data/upload/images"
);
const parseImage = raw({
  type: Object.keys(extensions),
  limit: "5mb"
});
const sendWeb = async (rows, value) => {
  let sent = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          JSON.parse(row.data),
          JSON.stringify(value),
          { TTL: 300 }
        );
        sent += 1;
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) {
          await run(
            `
            DELETE FROM web
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

  return { sent, failed };
};
const sendFcm = async (rows, value) => {
  let results;

  try {
    results = await fcm(
      rows.map((row) => row.fid),
      value
    );
  } catch {
    return { sent: 0, failed: rows.length };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    results.map(async (result) => {
      if (result.success) {
        sent += 1;

        return;
      }

      if (invalidFcm(result.error)) {
        await run("DELETE FROM fcm WHERE fid = ?", [
          result.fid
        ]);

        return;
      }

      failed += 1;
    })
  );

  return { sent, failed };
};
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
  if (!webEnabled && !fcmEnabled) {
    return res.status(503).end();
  }

  const title = string(req.body.title).trim();
  const body = string(req.body.body).trim();
  const link = string(req.body.url).trim();
  const image = string(req.body.image).trim();
  const url =
    link.startsWith("/") &&
    !link.startsWith("//") &&
    !link.includes("\\")
      ? link
      : "/";

  if (!title) {
    return res.status(400).end();
  }

  const [web, devices] = await Promise.all([
    webEnabled
      ? all(`
          SELECT web.endpoint, web.data
          FROM web
          JOIN user ON user.uid = web.uid
          WHERE NOT EXISTS (
            SELECT 1
            FROM block
            WHERE block.uid = user.uid
              OR block.ip = user.ip
          )
        `)
      : [],
    fcmEnabled
      ? all(`
          SELECT fcm.fid, fcm.device
          FROM fcm
          JOIN user ON user.uid = fcm.uid
          WHERE NOT EXISTS (
            SELECT 1
            FROM block
            WHERE block.uid = user.uid
              OR block.ip = user.ip
          )
        `)
      : []
  ]);
  const value = { title, body, image, url };
  const source =
    process.env.APP_URL?.trim() ||
    `${req.protocol}://${req.get("host")}`;
  const native = {
    ...value,
    image: image ? new URL(image, source).href : ""
  };
  const wear = devices.filter(
    ({ device }) => device === "wearable"
  );
  const [webResult, fcmResult] = await Promise.all([
    sendWeb(web, value),
    sendFcm(wear, native)
  ]);
  const sent = webResult.sent + fcmResult.sent;
  const failed = webResult.failed + fcmResult.failed;

  await record(req.user.uid, title, body, image, url);
  res.json({ sent, failed });
});

export default router;
