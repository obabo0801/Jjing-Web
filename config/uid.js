export default (req) =>
  process.env.COOKIE_SECRET
    ? req.signedCookies?.uid || ""
    : req.cookies?.uid || "";
