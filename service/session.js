import { randomBytes } from "node:crypto";
import { get } from "#db";
import { key } from "#config/uid";

export const cookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  signed: true,
  maxAge: 365 * 24 * 60 * 60 * 1000
};

export const remember = async (res, uid) => {
  if (!uid) return;
  const user = await get(
    "UPDATE user SET session = COALESCE(session, ?) WHERE uid = ? RETURNING session",
    [randomBytes(32).toString("base64url"), uid]
  );

  if (user) res.cookie(key, user.session, cookie);
};

export const read = async (value) => {
  if (typeof value !== "string") return null;
  if (/^[A-Za-z0-9_-]{43}$/.test(value))
    return get("SELECT uid FROM user WHERE session = ?", [value]);
  // 이전에 서명한 쿠키만 받아 새 세션으로 교체합니다.
  if (/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)) {
    const user = await get("SELECT uid FROM user WHERE uid = ?", [value]);

    return user && { ...user, legacy: true };
  }
  return null;
};
