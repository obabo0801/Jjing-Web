import { isPage } from "#page";
import { unavailable } from "#maintenance";

export default function error(error, req, res, next) {
  if (error?.code !== "SQLITE_BUSY") {
    return next(error);
  }

  if (!isPage(req)) {
    return res.status(503).end();
  }

  return unavailable(res);
}
