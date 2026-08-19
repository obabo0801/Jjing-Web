import { get } from "#config/sqlite";
import uid from "#config/uid";
import { isPage, send } from "#page";

export const unavailable = (res) => {
  res.set({
    "Cache-Control": "private, no-store",
    "X-Maintenance": "true",
    Vary: "Cookie"
  });

  return send(res, "maintenance", 503);
};

export default async function maintenance(req, res, next) {
  if (!isPage(req)) {
    return next();
  }

  const active = process.env.MAINTENANCE === "true";

  const dev = process.env.SERVER_ENV === "development";

  if (!active || dev) {
    return next();
  }

  const id = uid(req);

  const user = id
    ? await get("SELECT role FROM user WHERE uid = ?", [id])
    : null;

  if (user?.role === 0) {
    return next();
  }

  return unavailable(res);
}
