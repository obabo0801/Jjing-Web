import secret from "#config/env";

import cookie from "cookie-parser";
import express from "express";

import block from "#block";
import maint from "#maint";
import * as page from "#page";
import assets from "#assets";
import upload from "#upload";
import error from "#error";
import router from "#router";

const server = express();
const port = process.env.PORT;

server.set("trust proxy", "loopback");
server.use(cookie(secret));
server.use(express.json());
server.use(block);
server.use(maint);
server.use("/api", router);
server.use(upload);
server.use(page.router);
server.use(assets);
server.use(page.reject);
server.use(error);
server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
