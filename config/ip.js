export default (req) => {
  const ip = req.get("x-real-ip") || req.ip;

  return ip.startsWith("::ffff:")
    ? ip.slice(7)
    : ip;
};
