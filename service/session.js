import { randomBytes, randomUUID } from "node:crypto";
import * as db from "#db";
import * as ids from "#config/uid";

export const anonymous = "_guest";
export const login = "_login";
export const recovery = "_restore";

export const cookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  signed: true,
  maxAge: 365 * 24 * 60 * 60 * 1000
};

export const migrate = (req, res) => {
  const aliases = {
    [ids.key]: "7f4a9c2e",
    [anonymous]: "7f4a9c2e-guest",
    [login]: "7f4a9c2e-login",
    [recovery]: "7f4a9c2e-recovery"
  };

  for (const [key, previous] of Object.entries(aliases)) {
    const value = req.signedCookies?.[previous];

    if (!value) continue;

    if (req.signedCookies[key] === undefined) {
      req.signedCookies[key] = value;
      res.cookie(key, value, {
        ...cookie,
        maxAge: [login, recovery].includes(key) ? 10 * 60 * 1000 : cookie.maxAge
      });
    }

    res.clearCookie(previous, { ...cookie, maxAge: undefined });
  }
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
