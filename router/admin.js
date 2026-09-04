import { raw, Router } from "express";

import fcm, * as firebase from "#config/fcm";
import store from "#config/image";
import record from "#config/log/notify";
import webpush, * as push from "#config/push";
import { all, run } from "#config/sqlite";

import string from "#src/string";

import admin from "#middleware/admin";

const upload = raw({
  type: ["image/jpeg", "image/png", "image/webp"],
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

      if (firebase.invalid(result.error)) {
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

router.post("/image", upload, async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).end();
  }

  const image = await store(req.body, "images", {
    width: 1024,
    height: 1024,
    fit: "inside",
    quality: 80
  });

  if (!image) {
    return res.status(415).end();
  }

  return res.json({
    original: image.original,
    image: image.resizing
  });
});

router.post("/", async (req, res) => {
  if (!push.enabled && !firebase.enabled) {
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
    push.enabled
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
    firebase.enabled
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
