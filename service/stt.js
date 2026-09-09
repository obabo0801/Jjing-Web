import * as path from "#config/path";
import hash from "#config/hash";
import { run } from "#db";

const dir = path.stt();
const types = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };

const query = `
  INSERT INTO stt (
  file, uid, text, time
  )
  VALUES (?, ?, ?, ?)
  `;

export const supported = (type) => Object.hasOwn(types, type);

path.mkdirSync(dir, { recursive: true });

export default async function save(audio, options) {
  const { type, uid, text, time } = options;
  const ext = types[type];

  if (!ext || !Buffer.isBuffer(audio)) {
    return null;
  }

  const id = hash(32, audio);
  const file = `${id}.${ext}`;
  const target = path.stt(file);

  try {
    await path.writeFile(target, audio, { flag: "wx" });
  } catch (error) {
    if (error.code === "EEXIST") {
      return file;
    }

    throw error;
  }

  try {
    await run(query, [file, uid, text, time]);
  } catch (error) {
    try {
      await path.rm(target, { force: true });
    } catch {}

    throw error;
  }

  return file;
}
