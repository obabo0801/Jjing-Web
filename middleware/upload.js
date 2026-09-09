import express from "express";

import * as path from "#config/path";
import { routes } from "#config/media";

const router = express.Router();

const options = {
  dotfiles: "deny",
  fallthrough: false,
  index: false,
  maxAge: "1d",
  setHeaders(response) {
    response.setHeader("X-Content-Type-Options", "nosniff");
  }
};

for (const { directory, prefix } of routes) {
  router.use(prefix, express.static(path.upload(directory), options));
}

router.use("/upload", express.static(path.upload(), options));

export default router;
