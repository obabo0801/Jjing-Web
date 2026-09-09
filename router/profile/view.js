import { Router } from "express";

import { get } from "#db";
import identity from "#config/uid";
import * as media from "#config/media";
import * as events from "#service/events";
import recent from "#service/log/recent";
import { find } from "#service/profile/data";
import * as role from "#shared/role";
import string from "#shared/string";

const router = Router();

router.get("/:uid", async (req, res) => {
  const viewer = await find(identity(req));

  if (!viewer) {
    return res.status(403).end();
  }

  const uid =
    req.params.uid === "me" ? viewer.uid : string(req.params.uid).trim();
  const user = uid ? await find(uid) : null;

  if (!user) {
    return res.status(404).end();
  }

  const access = await recent(user.uid);
  const self = viewer.uid === user.uid;
  const manage = role.manages(viewer, user);
  const blocked = await get(
    "SELECT reason, time, actor, handler FROM block WHERE uid = ? OR ip = ? ORDER BY time DESC, rowid DESC LIMIT 1",
    [user.uid, user.ip]
  );

  const result = {
    uid: user.uid,
    short: user.uid.slice(0, 8),
    name: user.name || "",
    image: media.resolve(user.image),
    avatar: media.resolve(user.avatar),
    number: user.number,
    setup: Boolean(user.setup),
    self,
    state: events.state(user.uid),
    last: access?.time || user.date,
    manage,
    blocked: Boolean(blocked),
    block: manage ? blocked || null : null,
    details: null,
    authority: null
  };

  if (manage) {
    result.details = {
      uid: user.uid,
      email: user.email || "",
      userIp: user.initial || "",
      accessIp: user.ip,
      date: user.date,
      last: access?.time || "",
      os: access?.os || "",
      browser: access?.browser || "",
      lang: user.lang === "system" ? "" : user.lang || ""
    };
    if (viewer.role === role.root) {
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

  res.json(result);
});

export default router;
