import log from "#config/log";

const run = log(
  "notification",
  `
  CREATE TABLE IF NOT EXISTS notification (
    uid TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image TEXT NOT NULL,
    url TEXT NOT NULL,
    time TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE INDEX IF NOT EXISTS notification_uid
    ON notification (uid);
`
);

export default (uid, title, body, image, url) =>
  run(
    `
    INSERT INTO notification (
      uid,
      title,
      body,
      image,
      url
    )
    VALUES (?, ?, ?, ?, ?)
  `,
    [uid, title, body, image, url]
  );
