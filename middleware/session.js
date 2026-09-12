import { key } from "#config/uid";
import * as session from "#service/session";

export default async (req, res, next) => {
  const user = await session.read(req.signedCookies?.[key]);

  req.uid = user?.uid || "";
  if (user?.legacy) await session.remember(res, user.uid);
  next();
};
