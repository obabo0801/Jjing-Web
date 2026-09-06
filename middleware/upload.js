import express from "express";

import * as path from "#config/path";

const directory = path.upload();

export default express.static(directory, {
  dotfiles: "deny",
  fallthrough: false,
  index: false,
  maxAge: "1d",
  setHeaders(response) {
    response.setHeader("X-Content-Type-Options", "nosniff");
  }
});
