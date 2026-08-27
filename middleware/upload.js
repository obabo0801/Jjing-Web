import path from "node:path";

import express from "express";

const directory = path.join(
  import.meta.dirname,
  "../upload"
);

export default express.static(directory, {
  dotfiles: "deny",
  fallthrough: false,
  index: false,
  maxAge: "1d",

  setHeaders(response) {
    response.setHeader("X-Content-Type-Options", "nosniff");
  }
});
