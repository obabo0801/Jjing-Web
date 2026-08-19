export default (req) => {
  const ip =
    req.get("x-vercel-forwarded-for") || req.get("x-real-ip") || req.ip || "";

  return ip.replace(/^::ffff:|,.*/g, "").trim();
};
