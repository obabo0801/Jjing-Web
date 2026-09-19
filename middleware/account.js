import { get } from "#db";

export default async (req, res, next) => {
  const user = await get(
    `SELECT 1 FROM user WHERE uid = ? AND google IS NOT NULL
      AND deletion IS NULL AND erased = 0`,
    [req.uid]
  );

  if (!user) return res.status(403).end();

  next();
};
