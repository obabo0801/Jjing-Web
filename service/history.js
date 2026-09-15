import sharp from "sharp";
import * as path from "#config/path";
import * as media from "#config/media";
import { validId } from "#shared/chatting";

const person = (value) =>
  value && typeof value.id === "string" && /^[a-f0-9]{32}$/.test(value.id)
    ? {
        id: value.id,
        name: typeof value.name === "string" ? value.name.slice(0, 100) : "",
        verified: value.verified === true
      }
    : null;

export const read = (value) => {
  try {
    const data = typeof value === "string" ? JSON.parse(value) : value;

    if (data?.version !== 1 || !Array.isArray(data.messages)) return null;
    return {
      version: 1,
      ...(data.kind === "whisper" && { kind: "whisper" }),
      subject: person(data.subject),
      reporter: person(data.reporter),
      limited: data.limited === true,
      messages: data.messages
        .slice(0, data.kind === "whisper" ? 500 : 5)
        .filter(
          (item) => item && validId(item.url) && typeof item.text === "string"
        )
        .map((item) => ({
          ...person(item),
          url: item.url,
          text: item.text.slice(0, 2000),
          time: typeof item.time === "string" ? item.time : "",
          target: item.target === true,
          images: Array.isArray(item.images)
            ? item.images
                .slice(0, 10)
                .filter(
                  (image) =>
                    typeof image?.image === "string" &&
                    image.image.length <= 90000 &&
                    /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(
                      image.image
                    )
                )
                .map((image) => ({
                  image: image.image,
                  description:
                    typeof image.description === "string"
                      ? image.description.slice(0, 500)
                      : ""
                }))
            : []
        }))
    };
  } catch {
    return null;
  }
};

export const redact = (value, id) => {
  const data = read(value);

  if (!data) return value;
  for (const item of [...data.messages, data.subject, data.reporter]) {
    if (item?.id === id) {
      item.name = "";
      item.verified = false;
    }
  }
  return JSON.stringify(data);
};

const preview = async (value) => {
  const url = media.resolve(value);
  const route = media.routes.find(
    (item) =>
      !item.directory.startsWith("audio/") && url.startsWith(`${item.prefix}/`)
  );

  if (!route) return "";
  const file = url.slice(route.prefix.length + 1);

  if (!/^[a-f0-9]{32}\.(?:gif|jpg|png|webp)$/.test(file)) return "";
  try {
    const image = await sharp(
      await path.readFile(path.upload(route.directory, file)),
      { limitInputPixels: 40000000 }
    )
      .rotate()
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 60 })
      .toBuffer();

    return image.length <= 65536
      ? `data:image/webp;base64,${image.toString("base64")}`
      : "";
  } catch {
    return "";
  }
};

// Only nearby public conversation is retained; it is not a claim of causation.
export const capture = async (db, { message, uid }) => {
  const target = message
    ? await db.get(
        "SELECT seq FROM chatting WHERE id = ? AND deleted IS NULL",
        [message]
      )
    : await db.get(
        "SELECT seq FROM chatting WHERE uid = ? AND system IS NULL AND deleted IS NULL ORDER BY seq DESC LIMIT 1",
        [uid]
      );

  const subject = uid
    ? await db.get(
        "SELECT id, CASE WHEN google IS NOT NULL THEN name ELSE '' END AS name FROM user WHERE uid = ?",
        [uid]
      )
    : null;

  if (!target) return { version: 1, subject, messages: [], limited: false };
  const selection = `SELECT chatting.*, user.id AS public, user.name, user.google
    FROM chatting JOIN user ON user.uid = chatting.uid
    WHERE chatting.system IS NULL AND chatting.deleted IS NULL
      AND user.role = 0`;

  const rows = [
    ...(
      await db.all(`${selection} AND seq < ? ORDER BY seq DESC LIMIT 2`, [
        target.seq
      ])
    ).reverse(),
    ...(await db.all(`${selection} AND seq = ?`, [target.seq])),
    ...(await db.all(`${selection} AND seq > ? ORDER BY seq LIMIT 2`, [
      target.seq
    ]))
  ];
  const messages = [];

  let size = 0;
  let limited = false;

  for (const row of rows) {
    const item = {
      url: row.id,
      id: row.public,
      name: row.google ? row.name || "" : "",
      verified: Boolean(row.google),
      text: row.text,
      time: row.time,
      target: row.seq === target.seq,
      images: []
    };

    let attachments;

    try {
      attachments = JSON.parse(row.attachments || "[]");
    } catch {
      attachments = [];
    }
    if (!Array.isArray(attachments)) attachments = [];
    if (!attachments.length && row.image)
      attachments = [{ preview: row.preview || row.image }];
    for (const attachment of attachments) {
      const image = await preview(attachment.preview || attachment.image);

      if (!image || size + image.length > 350000) {
        limited = true;
        continue;
      }
      size += image.length;
      item.images.push({
        image,
        description: String(attachment.description || "").slice(0, 500)
      });
    }
    if (row.audio) limited = true;
    messages.push(item);
  }
  return { version: 1, subject, messages, limited };
};
