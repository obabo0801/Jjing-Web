import "dotenv/config";

import cookie from "cookie-parser";
import express from "express";

import block from "#block";
import maintenance from "#maintenance";
import page, { reject } from "#page";
import assets from "#assets";
import error from "#error";
import router from "#router";

const server = express();
const port = process.env.PORT || 3000;
const secret = process.env.COOKIE_SECRET;

server.set("trust proxy", "loopback");

server.use(cookie(secret));
server.use(express.json());

server.use(block);
server.use(maintenance);

server.use("/api", router);

server.use(page);
server.use(assets);
server.use(reject);

server.use(error);

server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
