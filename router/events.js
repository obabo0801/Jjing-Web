import { Router } from "express";

import * as events from "#config/events";
import address from "#config/ip";
import { get } from "#config/sqlite";
import identity from "#config/uid";

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

  events.touch(user.uid);
  res.status(204).end();
});

router.get("/", async (req, res) => {
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

  const close = events.connect(user, res);
  const ping = setInterval(() => {
    res.write(": ping\n\n");
  }, 25_000);

  ping.unref?.();
  req.on("close", () => {
    clearInterval(ping);
    close();
  });
});

export default router;
