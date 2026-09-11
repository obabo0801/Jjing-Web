import { createHash } from "node:crypto";

export const key = "7f4a9c2e";

// 내부 UID를 공개하지 않고 같은 사용자에 항상 같은 공개 ID를 부여합니다.
export const publicId = (uid) =>
  createHash("sha256").update(`profile:${uid}`).digest("hex").slice(0, 32);

export default (req) => {
  const value = req.signedCookies?.[key];

  return typeof value === "string" ? value : "";
};
