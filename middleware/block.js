import { get } from "#config/sqlite";
import address from "#config/ip";
import uid from "#config/uid";

import { isPage, send } from "#page";

export default async function block(req, res, next) {
  if (!isPage(req)) {
    return next();
  }

  const ip = address(req);

  const denied = await get(`
    SELECT 1
    FROM block
    WHERE uid = ?
      OR ip = ?
    LIMIT 1
  `, [uid(req) || null, ip]);

  if (!denied) {
    return next();
  }

  res.set({
    "Cache-Control": "private, no-store",
    Vary: "Cookie"
  });

  return send(res, "block", 403);
}
