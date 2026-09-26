import * as express from "express";
import identity from "../config/uid.js";
import address from "../config/ip.js";
import limit from "../middleware/limit.js";
import * as chatting from "../service/chatting.js";
import * as publicroom from "../service/chatting/room.js";
import store from "../service/image.js";
import audio from "../service/audio.js";
import maximum from "../../lib/upload.js";
import * as attachment from "../service/chatting/attach.js";
import * as rules from "../../lib/attach.js";
import * as direct from "#service/chatting/direct";
import * as assets from "#service/chatting/assets";
import * as room from "#service/room";
import * as contact from "#service/contact";
import metadata from "#service/metadata";
import { resolve } from "#shared/link";

const router = express.Router();
const allowed = limit("chatting:allowed", 30);
const previews = limit("chatting:previews", 12);

let fetching = 0;

router.use(async (req, res, next) => {
  res.set({ "Cache-Control": "private, no-store", Vary: "Cookie" });
  try {
    req.chatUser = await chatting.viewer(
      identity(req),
      address(req),
      req.app.get("env") === "development"
    );

    next();
  } catch (error) {
    next(error);
  }
});

router.get("/public", async (req, res) => {
  res.json({ items: await publicroom.list(req.chatUser, req.query.manage === "1") });
});

router.post("/public", async (req, res) => {
  res.status(201).json(await publicroom.save(req.chatUser, null, req.body));
});

router.get("/public/:id", async (req, res) => {
  res.json(await publicroom.read(req.chatUser, req.params.id));
});

router.patch("/public/:id", async (req, res) => {
  res.json(await publicroom.save(req.chatUser, req.params.id, req.body));
});

router.delete("/public/:id", async (req, res) => {
  res.json(await publicroom.remove(req.chatUser, req.params.id));
});

router.use(async (req, res, next) => {
  if (/^\/(direct|rooms|contact)(\/|$)/.test(req.path)) return next();

  if (["/attachment", "/embed", "/mentions"].includes(req.path)) return next();
  const id = req.get("X-Chatting-Room");
  const token = /^\/([\da-f-]{36})(?:\/restore)?$/i.exec(req.path)?.[1];
  const current = token
    ? await publicroom.message(req.chatUser, token, id)
    : await publicroom.read(req.chatUser, id);

  req.chatUser.room = current.id;
  next();
});

router.get("/", async (req, res) => {
  res.json(await chatting.list(req.chatUser, req.query));
});

router.get("/mentions", async (req, res) => {
  res.json(await chatting.suggest(req.query.q, req.query.lang, req.chatUser.uid));
});

router.post("/embed", async (req, res) => {
  const url = resolve(req.body?.url);

  if (!url || !/^https?:/i.test(url) || url.length > 2048) return res.status(400).end();

  if (!(await previews(req.chatUser.uid)) || fetching >= 4) return res.status(429).end();

  fetching += 1;
  try {
    res.json(await metadata(url));
  } finally {
    fetching -= 1;
  }
});

router.get("/assets", async (req, res) => {
  res.json(await assets.list(req.chatUser, req.query));
});

router.get("/assets/:id", async (req, res) => {
  res.json(await assets.preview(req.chatUser, req.params.id));
});

router.get("/recent", async (req, res) => {
  res.json(await chatting.recent(req.chatUser, req.query));
});

router.post(["/contact", "/contact/:id"], async (req, res) => {
  if (req.get("sec-fetch-site") === "cross-site" || !req.is("application/json"))
    return res.status(403).end();

  if (!(await allowed(req.chatUser.uid))) return res.status(429).end();

  const result = await contact.open(req.chatUser, req.params.id);

  res.json(result.draft ? result : await room.read(req.chatUser, result.id));
  if (req.params.id) await room.notify(result.id);
});

router.get("/direct/message", async (req, res) => {
  res.json(await direct.list(req.chatUser, req.query.id || "", req.query.before));
});

router.get("/direct/unread", async (req, res) => {
  res.json(await direct.unread(req.chatUser));
});

router.get("/direct/message/:id/room", async (req, res) => {
  res.json(await room.preview(req.chatUser, req.params.id));
});

router.get("/rooms/search", async (req, res) => {
  res.json(await room.search(req.chatUser, req.query.q || "", req.query.room || ""));
});

router.post("/rooms", async (req, res) => {
  const value = await room.create(req.chatUser, req.body?.ids ?? req.body?.id);

  const current = await room.read(req.chatUser, value.id);

  if (!current.available) return res.status(409).json({ code: "unavailable" });

  res.json(current);
});

router.post("/rooms/:id/invite", async (req, res) => {
  res.json(await room.invite(req.chatUser, req.params.id, req.body?.ids ?? req.body?.id));
});

router.patch("/rooms/:id", async (req, res) => {
  res.json(await room.manage(req.chatUser, req.params.id, req.body?.action, req.body?.value));
});

router.get("/rooms/:id", async (req, res) => {
  res.json(await room.read(req.chatUser, req.params.id));
});

router.get("/rooms/:id/assets", async (req, res) => {
  res.json(await assets.list(req.chatUser, req.query, req.params.id));
});

router.get("/rooms/:room/assets/:id", async (req, res) => {
  res.json(await assets.preview(req.chatUser, req.params.id, req.params.room));
});

router.post("/rooms/:id/leave", async (req, res) => {
  res.json(await room.leave(req.chatUser, req.params.id));
});

router.patch("/direct/:id/block", async (req, res) => {
  await room.block(req.chatUser, req.params.id, req.body?.blocked);
  res.status(204).end();
});

router.post("/direct/message/:id/read", async (req, res) => {
  await direct.read(req.chatUser, req.params.id, req.body?.token);
  res.status(204).end();
});

router.post("/direct/message/:token/restore", async (req, res) => {
  if (req.get("sec-fetch-site") === "cross-site" || !req.is("application/json"))
    return res.status(403).end();

  res.json(await direct.restore(req.chatUser, req.params.token));
});

router.delete("/direct/message/:token", async (req, res) => {
  res.json(await direct.remove(req.chatUser, req.params.token));
});

router.patch("/direct/message/:id", async (req, res) => {
  await direct.configure(req.chatUser, req.params.id, req.body?.action, req.body?.value);

  res.status(204).end();
});

router.post("/direct/:kind/:id", async (req, res) => {
  if (!(await allowed(req.chatUser.uid))) return res.status(429).end();

  await chatting.writable(req.chatUser);

  const items = req.body?.attachments ?? [];
  const result =
    req.params.kind === "message"
      ? await attachment.send(req.chatUser, "message", req.body?.token, items, (attachments) =>
          direct.send(req.chatUser, req.params.kind, req.params.id, req.body?.text, {
            attachments,
            broadcast: false
          })
        )
      : await direct.send(req.chatUser, req.params.kind, req.params.id, req.body?.text, {
          attachments: await attachment.resolve(req.chatUser, items)
        });

  if (req.params.kind === "message")
    await Promise.allSettled([direct.deliver(req.chatUser, result)]);

  res.status(201).json(result);
});

router.post(
  "/direct/message/:id/audio",
  express.raw({ type: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"], limit: maximum }),
  async (req, res) => {
    if (!(await allowed(req.chatUser.uid))) return res.status(429).end();

    await chatting.writable(req.chatUser);

    const source = await audio(req.body, req.get("Content-Type"), req.chatUser.uid);

    if (!source) return res.status(415).end();

    res
      .status(201)
      .json(await direct.send(req.chatUser, "message", req.params.id, "", { audio: source }));
  }
);

router.get("/:id", async (req, res) => {
  res.json(await chatting.around(req.chatUser, req.params.id));
});

router.post("/:id/restore", async (req, res) => {
  if (req.get("sec-fetch-site") === "cross-site" || !req.is("application/json"))
    return res.status(403).end();

  res.json(await chatting.restore(req.chatUser, req.params.id));
});

router.delete("/:id", async (req, res) => {
  await chatting.remove(req.chatUser, req.params.id);
  res.status(204).end();
});

router.post(["/", "/image", "/audio", "/attachment"], async (req, res, next) => {
  if (!(await allowed(req.chatUser.uid))) {
    res.set("Retry-After", "60");

    return res.status(429).end();
  }

  await chatting.writable(req.chatUser);
  next();
});

router.post("/", async (req, res) => {
  const items = req.body?.attachments ?? [];
  const message = await attachment.send(
    req.chatUser,
    `${req.path}:${req.chatUser.room}`,
    req.body?.token,
    items,
    (attachments) =>
      chatting.save(req.chatUser, address(req), req.body?.text, null, null, attachments)
  );

  // 알림 전송 실패가 이미 저장된 메시지의 실패 응답으로 바뀌지 않습니다.
  await Promise.allSettled([chatting.deliver(message.url)]);
  res.status(201).json(message);
});

router.post("/attachment", express.raw({ type: rules.types, limit: maximum }), async (req, res) => {
  const user = await chatting.viewer(
    identity(req),
    address(req),
    req.app.get("env") === "development"
  );

  await chatting.writable(user);
  res
    .status(201)
    .json(
      await attachment.upload(
        user,
        req.body,
        req.get("Content-Type")?.split(";")[0],
        req.get("X-Image-Edit")
      )
    );
});

router.post(
  "/image",
  express.raw({ type: ["image/jpeg", "image/png", "image/webp", "image/gif"], limit: maximum }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(415).end();

    await chatting.viewer(identity(req), address(req), req.app.get("env") === "development");

    await chatting.writable(req.chatUser);

    const image = await store(req.body, "images", {
      uid: req.chatUser.uid,
      width: 1280,
      height: 1280,
      fit: "inside",
      quality: 85
    });

    if (!image) return res.status(415).end();
    const message = await chatting.save(req.chatUser, address(req), "", image);

    await Promise.allSettled([chatting.deliver(message.url)]);
    res.status(201).json(message);
  }
);

router.post(
  "/audio",
  express.raw({ type: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"], limit: maximum }),
  async (req, res) => {
    await chatting.viewer(identity(req), address(req), req.app.get("env") === "development");

    await chatting.writable(req.chatUser);

    const source = await audio(req.body, req.get("Content-Type"), req.chatUser.uid);

    if (!source) return res.status(415).end();
    const message = await chatting.save(req.chatUser, address(req), "", null, source);

    await Promise.allSettled([chatting.deliver(message.url)]);
    res.status(201).json(message);
  }
);

router.use((error, req, res, next) => {
  if (error.status === 409) return res.status(409).json({ code: error.code });

  if (error.status === 423)
    return res.status(423).json({ until: error.until, restriction: error.restriction });

  if (error.status) return res.status(error.status).end();

  next(error);
});

export default router;
