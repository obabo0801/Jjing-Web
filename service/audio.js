import * as path from "#config/path";
import * as media from "#config/media";
import hash from "#config/hash";
import maximum from "#shared/upload";

export default async function store(data, type = "") {
  if (!Buffer.isBuffer(data) || !data.length || data.length > maximum)
    return null;
  const mime = type.split(";")[0].trim().toLowerCase();
  const head = data.subarray(0, 12);
  const formats = {
    "audio/webm": head.subarray(0, 4).toString("hex") === "1a45dfa3" && "webm",
    "audio/ogg": head.toString("ascii", 0, 4) === "OggS" && "ogg",
    "audio/mp4": head.toString("ascii", 4, 8) === "ftyp" && "m4a",
    "audio/mpeg":
      (head.toString("ascii", 0, 3) === "ID3" ||
        (head[0] === 255 && (head[1] & 224) === 224)) &&
      "mp3"
  };
  const extension = Object.hasOwn(formats, mime) && formats[mime];

  if (!extension) return null;
  const file = `${hash(32, data)}.${extension}`;

  await path.mkdir(path.upload("audio", "original"), { recursive: true });
  try {
    await path.writeFile(path.upload("audio", "original", file), data, {
      flag: "wx"
    });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  return media.url("audio", "original", file);
}
