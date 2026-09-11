import { Router } from "express";

import { get } from "#db";
import identity from "#config/uid";
import * as media from "#config/media";
import * as events from "#service/events";
import recent from "#service/log/recent";
import { find, resolve } from "#service/profile/data";
import * as role from "#shared/role";
import string from "#shared/string";

const router = Router();

router.get("/:id", async (req, res) => {
  const viewer = await find(identity(req));

  if (!viewer) {
    return res.status(403).end();
  }

  const user =
    req.params.id === "me"
      ? viewer
      : await resolve(string(req.params.id).trim());

  if (!user) {
    return res.status(404).end();
  }

  const access = await recent(user.uid);
  const self = viewer.uid === user.uid;
  const manage = role.manages(viewer, user);
  const result = {
    id: user.id,
    name: user.name || "",
    image: media.resolve(user.image),
    avatar: media.resolve(user.avatar),
    self,
    state: events.state(user.uid),
    time: access?.time || user.date,
    manage
  };

  if (self) {
    result.setup = Boolean(user.setup);
  }

  if (manage) {
    const blocked = await get(
      "SELECT reason, time, actor, handler FROM block WHERE uid = ? OR ip = ? ORDER BY time DESC, rowid DESC LIMIT 1",
      [user.uid, user.ip]
    );

    result.blocked = Boolean(blocked);
    result.block = blocked || null;
    result.sanction =
      (await get(
        `SELECT count,
      CASE WHEN muted > datetime('now', '+9 hours') THEN muted END AS muted,
      CASE WHEN kicked > datetime('now', '+9 hours') THEN kicked END AS kicked
      FROM sanction WHERE uid = ?`,
        [user.uid]
      )) || null;
  }

  if (manage || (self && role.staff(viewer.role))) {
    result.details = {
      uid: user.uid,
      email: user.email || "",
      userIp: user.initial || "",
      accessIp: user.ip,
      date: user.date,
      time: access?.time || "",
      os: access?.os || "",
      browser: access?.browser || "",
      lang: user.lang === "system" ? "" : user.lang || ""
    };
    if (manage && viewer.role === role.root) {
      const authority = await get(
        "SELECT memo, time, actor, handler FROM authority WHERE uid = ?",
        [user.uid]
      );

      result.authority = {
        ...authority,
        enabled: user.role === role.admin,
        activity: null
      };
    }
  }

  res.set("Cache-Control", "private, no-store").json(result);
});

export default router;
