import { page, reject } from "#page";
import { unavailable } from "#maint";

export default function error(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.status === 404) {
    res.set({ "Cache-Control": "no-store", Vary: "Sec-Fetch-Dest, Accept" });

    return reject(req, res);
  }

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
