import path from "node:path";

import express from "express";

const dist = path.join(import.meta.dirname, "../dist");

const assets = express.static(dist, {
  setHeaders(res, file) {
    if (file.endsWith("service-work.js")) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Vary", "Sec-Fetch-Dest, Accept");
    }
  }
});

export default assets;
