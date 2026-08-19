import log from "#config/log";

const run = log(
  "access",
  `
  CREATE TABLE IF NOT EXISTS access (
    uid TEXT,
    ip TEXT NOT NULL,
    os TEXT NOT NULL,
    browser TEXT NOT NULL,
    path TEXT NOT NULL,
    result INTEGER NOT NULL,
    time TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );
`
);

export default (uid, ip, os, browser, path, result) =>
  run(
    `
    INSERT INTO access (
      uid, ip, os, browser, path, result
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [uid, ip, os, browser, path, result]
  );
