import { Router, raw } from "express";
import identity from "#config/uid";
import address from "#config/ip";
import limit from "#middleware/limit";
import * as chatting from "#service/chatting";
import store from "#service/image";
import audio from "#service/audio";
import maximum from "#shared/upload";
import * as attachment from "#service/chatting/attachment";
import * as rules from "#shared/attachment";

const router = Router();
const allowed = limit(30);

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

router.get("/", async (req, res) => {
  res.json(await chatting.list(req.chatUser, req.query));
});

router.get("/:id", async (req, res) => {
  res.json(await chatting.around(req.chatUser, req.params.id));
});

router.delete("/:id", async (req, res) => {
  await chatting.remove(req.chatUser, req.params.id);
  res.status(204).end();
});

router.post(
  ["/", "/image", "/audio", "/attachment"],
  async (req, res, next) => {
    if (!allowed(req.chatUser.uid)) {
      res.set("Retry-After", "60");
      return res.status(429).end();
    }
    await chatting.writable(req.chatUser);
    next();
  }
);

router.post("/", async (req, res) => {
  const items = req.body?.attachments ?? [];
  const attachments = await attachment.resolve(req.chatUser, items);
  const message = await chatting.save(
    req.chatUser,
    address(req),
    req.body?.text,
    null,
    null,
    attachments
  );

  attachment.consume(req.chatUser, items);

  // 알림 전송 실패가 이미 저장된 메시지의 실패 응답으로 바뀌지 않습니다.
  await chatting.deliver(message.url);
  res.status(201).json(message);
});

router.post(
  "/attachment",
  raw({ type: rules.types, limit: maximum }),
  async (req, res) => {
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
  }
);

router.post(
  "/image",
  raw({
    type: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    limit: maximum
  }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length)
      return res.status(415).end();
    await chatting.viewer(
      identity(req),
      address(req),
      req.app.get("env") === "development"
    );
    await chatting.writable(req.chatUser);
    const image = await store(req.body, "images", {
      width: 1280,
      height: 1280,
      fit: "inside",
      quality: 85
    });

    if (!image) return res.status(415).end();
    const message = await chatting.save(req.chatUser, address(req), "", image);

    await chatting.deliver(message.url);
    res.status(201).json(message);
  }
);

router.post(
  "/audio",
  raw({
    type: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"],
    limit: maximum
  }),
  async (req, res) => {
    await chatting.viewer(
      identity(req),
      address(req),
      req.app.get("env") === "development"
    );
    await chatting.writable(req.chatUser);
    const source = await audio(req.body, req.get("Content-Type"));

    if (!source) return res.status(415).end();
    const message = await chatting.save(
      req.chatUser,
      address(req),
      "",
      null,
      source
    );

    await chatting.deliver(message.url);
    res.status(201).json(message);
  }
);

router.use((error, req, res, next) => {
  if (error.status === 423)
    return res
      .status(423)
      .json({ until: error.until, restriction: error.restriction });
  if (error.status) return res.status(error.status).end();
  next(error);
});

export default router;
