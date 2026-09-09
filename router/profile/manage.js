import { Router } from "express";

import admin from "#middleware/admin";
import * as events from "#service/events";
import management from "#service/manage";
import * as role from "#shared/role";
import string from "#shared/string";

const router = Router();

router.post("/:uid/block", admin, async (req, res) => {
  const reason = string(req.body?.reason).trim();

  if (!reason || reason.length > 500) {
    return res.status(400).end();
  }

  const uid = string(req.params.uid).trim();

  try {
    await management(req.user.uid, uid, "block", { reason });
  } catch (error) {
    if (error.status) return res.status(error.status).end();
    throw error;
  }
  events.send(uid, "block");
  events.send(uid, "role", { role: role.user });
  events.broadcast("chatting-block", { uid });
  events.broadcast("profile-update", { uid });
  res.status(204).end();
});

router.delete("/:uid/block", admin, async (req, res) => {
  const uid = string(req.params.uid).trim();
  const reason = string(req.body?.reason).trim();

  if (!reason || reason.length > 500) return res.status(400).end();

  let current;

  try {
    current = await management(req.user.uid, uid, "unblock", { reason });
  } catch (error) {
    if (error.status) return res.status(error.status).end();
    throw error;
  }
  events.broadcast("chatting-unblock", { uid });
  events.send(uid, "role", { role: current.role });
  events.broadcast("profile-update", { uid });
  res.status(204).end();
});

router.patch("/:uid/authority", admin, async (req, res) => {
  const uid = string(req.params.uid).trim();
  const { enabled, memo } = req.body || {};

  if (req.user.role !== role.root) return res.status(403).end();
  if (
    (enabled === undefined && memo === undefined) ||
    (enabled !== undefined && typeof enabled !== "boolean") ||
    (memo !== undefined &&
      (typeof memo !== "string" || memo.trim().length > 500))
  ) {
    return res.status(400).end();
  }
  try {
    await management(req.user.uid, uid, "authority", {
      enabled,
      ...(memo !== undefined && { memo: memo.trim() })
    });
  } catch (error) {
    if (error.status) return res.status(error.status).end();
    throw error;
  }
  if (enabled !== undefined)
    events.send(uid, "role", { role: enabled ? role.admin : role.user });
  events.broadcast("profile-update", { uid });
  res.status(204).end();
});

export default router;
