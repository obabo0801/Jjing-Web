import { Router } from "express";

import * as events from "../service/events.js";
import address from "../config/ip.js";
import { get } from "../db/index.js";
import identity from "../config/uid.js";
import { viewer } from "../service/chatting.js";

const router = Router();

const find = async (req) => {
  const uid = identity(req);
  const ip = address(req);

  return uid
    ? await get(
        `
        SELECT user.uid, user.role
        FROM user
        WHERE user.uid = ?
          AND NOT EXISTS (
            SELECT 1
            FROM block
            WHERE block.uid = user.uid
              OR block.ip = ?
          )
          AND NOT EXISTS (SELECT 1 FROM sanction WHERE uid = user.uid
            AND kicked > datetime('now', '+9 hours'))
      `,
        [uid, ip]
      )
    : null;
};

router.post("/", async (req, res) => {
  const user = await find(req);

  if (!user) {
    return res.status(403).end();
  }

  if (
    typeof req.body?.session !== "string" ||
    !events.touch(user.uid, req.body.session, req.body.visible, req.body.active)
  )
    return res.status(409).end();
  res.status(204).end();
});

router.get("/list", async (req, res) => {
  res.set({ "Cache-Control": "private, no-store", Vary: "Cookie" });
  try {
    await viewer(
      identity(req),
      address(req),
      req.app.get("env") === "development"
    );
    const result = await events.list();

    await viewer(
      identity(req),
      address(req),
      req.app.get("env") === "development"
    );
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).end();
    throw error;
  }
});

router.get("/", async (req, res) => {
  const tab = req.query.tab;

  if (
    tab !== undefined &&
    (typeof tab !== "string" ||
      !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(tab))
  )
    return res.status(400).end();
  const user = await find(req);

  if (!user) {
    return res.status(403).end();
  }

  res.set({
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream"
  });
  res.flushHeaders?.();
  res.write("retry: 3000\n\n");

  const close = events.connect(
    {
      ...user,
      tab,
      ip: address(req),
      development: req.app.get("env") === "development"
    },
    res
  );

  const ping = setInterval(() => {
    if (res.writableEnded || res.destroyed) return;
    res.write("event: heartbeat\ndata: {}\n\n");
  }, 25_000);

  ping.unref?.();
  const cleanup = () => {
    clearInterval(ping);
    close();
  };

  req.on("close", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup);
});

export default router;
