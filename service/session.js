import { randomBytes, randomUUID } from "node:crypto";
import * as db from "#db";
import * as ids from "#config/uid";

export const anonymous = `${ids.key}-guest`;

export const cookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  signed: true,
  maxAge: 365 * 24 * 60 * 60 * 1000
};

export const remember = async (res, uid, key = ids.key) => {
  if (!uid) return;
  const user = await db.get(
    `UPDATE user SET session = COALESCE(session, ?)
      WHERE uid = ? AND deletion IS NULL AND erased = 0 RETURNING session`,
    [randomBytes(32).toString("base64url"), uid]
  );

  if (user) res.cookie(key, user.session, cookie);

  return Boolean(user);
};

export const read = async (value) => {
  if (typeof value !== "string") return null;
  if (/^[A-Za-z0-9_-]{43}$/.test(value))
    return db.get(
      `SELECT uid FROM user WHERE session = ?
        AND deletion IS NULL AND erased = 0`,
      [value]
    );
  // 이전에 서명한 쿠키만 받아 새 세션으로 교체합니다.
  if (/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)) {
    const user = await db.get(
      `SELECT uid FROM user WHERE uid = ?
        AND deletion IS NULL AND erased = 0`,
      [value]
    );

    return user && { ...user, legacy: true };
  }

  return null;
};

export const create = async (ip, lang) => {
  const uid = randomUUID();

  await db.run(
    `INSERT INTO user (uid, id, ip, initial, lang)
      VALUES (?, ?, ?, ?, ?)`,
    [uid, ids.publicId(uid), ip, ip, lang]
  );

  return uid;
};
