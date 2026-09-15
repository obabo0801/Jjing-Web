import { createHash } from "node:crypto";

export const key = "7f4a9c2e";

// 내부 UID를 공개하지 않고 같은 사용자에 항상 같은 공개 ID를 부여합니다.
export const publicId = (uid) =>
  createHash("sha256").update(`profile:${uid}`).digest("hex").slice(0, 32);

// 이전 기록에서 이름 대신 저장한 UID도 응답에 포함하지 않습니다.
export const publicName = (value) =>
  typeof value === "string" &&
  /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
    ? publicId(value)
    : value || "";

export default (req) => req.uid || "";
