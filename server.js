import "dotenv/config";

import cookie from "cookie-parser";
import express from "express";

import block from "#block";
import maint from "#maint";
import page, { reject } from "#page";
import assets from "#assets";
import upload from "#upload";
import error from "#error";
import router from "#router";

const server = express();
const port = process.env.PORT;
const secret = process.env.COOKIE_SECRET;

server.set("trust proxy", "loopback");
server.use(cookie(secret));
server.use(express.json());
server.use(block);
server.use(maint);
server.use("/api", router);
server.use("/upload", upload);
server.use(page);
server.use(assets);
server.use(reject);
server.use(error);
server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
