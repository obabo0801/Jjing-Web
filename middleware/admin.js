import { get } from "#config/sqlite";
import uid from "#config/uid";

const find = async (req) => {
  const id = uid(req);

  if (!id) {
    return null;
  }

  return get("SELECT uid, role FROM user WHERE uid = ?", [id]);
};

export const allowed = async (req) => (await find(req))?.role === 0;

export default async function admin(req, res, next) {
  const user = await find(req);

  if (user?.role !== 0) {
    return res.status(403).end();
  }

  req.user = user;
  next();
}
