import { Router } from "express";

import identity from "#config/uid";
import file from "#config/pages";
import { allowed as admin } from "#middleware/admin";

const hidden = new Set([
  "/service-work.js",
  "/manifest.json"
]);
const html = (req) => req.path.endsWith(".html");
const denied = (req) =>
  hidden.has(req.path) ||
  html(req) ||
  req.path.startsWith("/assets/");

export const page = (req) =>
  req.method === "GET" &&
  (req.get("sec-fetch-dest") === "document" ||
    req.get("accept")?.includes("text/html"));

export const send = (res, name, status = 200) =>
  res.status(status).sendFile(file(name));

export const error = (res) => {
  res.set({
    "Cache-Control": "no-store",
    Vary: "Sec-Fetch-Dest, Accept"
  });

  return send(res, "error", 404);
};

const normal = (res, name) => {
  res.set("Cache-Control", "no-cache");

  return send(res, name);
};
const router = Router();

router.get("/", (_, res) => normal(res, "index"));
router.get("/terms", (_, res) => normal(res, "terms"));
router.get("/privacy", (_, res) => normal(res, "privacy"));
router.get("/admin", async (req, res) => {
  if (!(await admin(req))) {
    return error(res);
  }

  res.set("Cache-Control", "private, no-store");

  return send(res, "admin");
});
router.get("/maint", (req, res) => {
  if (req.get("x-maint") !== "true") {
    return error(res);
  }

  res.set("Cache-Control", "no-store");

  return send(res, "maint", 503);
});
router.get("/denied", (req, res) => {
  if (identity(req) || req.get("x-denied") !== "true") {
    return error(res);
  }

  res.set("Cache-Control", "no-store");

  return send(res, "denied");
});
router.get("/offline", (req, res) => {
  if (req.get("x-pwa-cache") !== "true") {
    return error(res);
  }

  res.set("Cache-Control", "no-store");

  return send(res, "offline");
});
router.use((req, res, next) => {
  if (req.method !== "GET" || !denied(req)) {
    return next();
  }

  if (!page(req)) {
    if (html(req)) {
      return res.status(404).end();
    }

    return next();
  }

  return error(res);
});

export const reject = (req, res) => {
  if (!page(req)) {
    return res.status(404).end();
  }

  return error(res);
};

export default router;
