import { get, run } from "#db";

export const clear = () =>
  run(`
    UPDATE user SET draft = NULL
    WHERE json_extract(draft, '$.time')
      < datetime('now', '+9 hours', '-15 minutes')
  `);

export const find = (uid) =>
  get(
    `
    SELECT
      rowid AS number,
      uid,
      id,
      name,
      email,
      image,
      avatar,
      setup,
      role,
      ip,
      initial,
      lang,
      date
    FROM user
    WHERE uid = ?
  `,
    [uid]
  );

export const resolve = async (id) => {
  const user = await get("SELECT uid FROM user WHERE id = ?", [id]);

  return user ? find(user.uid) : null;
};
