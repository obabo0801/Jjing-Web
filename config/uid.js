export default (req) => {
  if (process.env.COOKIE_SECRET) {
    return req.signedCookies?.uid || "";
  }

  return req.cookies.uid || "";
};
