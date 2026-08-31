import { get } from "#config/sqlite";
import uid from "#config/uid";
import { page, send } from "#page";

export const unavailable = (res) => {
  res.set({
    "Cache-Control": "private, no-store",
    "X-Maint": "true",
    Vary: "Cookie"
  });

  return send(res, "maint", 503);
};

export default async function maint(req, res, next) {
  if (!page(req)) {
    return next();
  }

  const active = process.env.MAINTENANCE === "true";
  const dev = req.app.get("env") === "development";

  if (!active || dev) {
    return next();
  }

  const id = uid(req);
  const user = id
    ? await get(
        `
        SELECT role
        FROM user
        WHERE uid = ?
      `,
        [id]
      )
    : null;

  if (user?.role === 0) {
    return next();
  }

  return unavailable(res);
}
