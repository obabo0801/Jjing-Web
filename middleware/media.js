import media from "#service/media";

export default async function resolve(req, res, next) {
  const url = new URL(req.url, "http://localhost");
  const match = /^\/media\/([a-f0-9]{32})$/.exec(url.pathname);

  if (!match || !["GET", "HEAD"].includes(req.method)) return next();
  try {
    const location = await media(match[1]);

    res.statusCode = location ? 302 : 404;
    res.setHeader("Cache-Control", "no-store");
    if (location) res.setHeader("Location", location);
    res.end();
  } catch (error) {
    next(error);
  }
}
