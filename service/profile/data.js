import { get, run } from "#db";

export const clear = () =>
  run(`
    DELETE FROM draft
    WHERE time < datetime('now', '+9 hours', '-15 minutes')
  `);

export const find = (uid) =>
  get(
    `
    SELECT
      rowid AS number,
      uid,
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
