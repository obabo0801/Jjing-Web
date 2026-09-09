import { get } from "#db";
import address from "#config/ip";
import uid from "#config/uid";

import { page, send } from "#page";

export const denied = async (req) => {
  const ip = address(req);

  return get(
    `
    SELECT 1
    FROM block
    WHERE uid = ?
      OR ip = ?
    LIMIT 1
  `,
    [uid(req) || null, ip]
  );
};

export const guard = async (req, res, next) => {
  if (!(await denied(req))) {
    return next();
  }

  return res.status(403).end();
};

export default async function block(req, res, next) {
  if (!page(req)) {
    return next();
  }

  if (!(await denied(req))) {
    return next();
  }

  res.set({ "Cache-Control": "private, no-store", Vary: "Cookie" });

  return send(res, "block", 403);
}
