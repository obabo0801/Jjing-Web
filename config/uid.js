export const key = "7f4a9c2e";

export default (req) =>
  process.env.COOKIE_SECRET
    ? req.signedCookies?.[key] || ""
    : req.cookies?.[key] || "";
