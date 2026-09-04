import { page } from "#page";
import { unavailable } from "#maint";

export default function error(error, req, res, next) {
  if (error?.code === "ENOENT") {
    return res.status(503).end();
  }

  if (error?.code !== "SQLITE_BUSY") {
    return next(error);
  }

  if (!page(req)) {
    return res.status(503).end();
  }

  return unavailable(res);
}
