import log from "#config/log";

const run = log(
  "stt",
  `
  CREATE TABLE IF NOT EXISTS stt (
    uid TEXT NOT NULL,
    lang TEXT NOT NULL,
    text TEXT NOT NULL,
    pitch TEXT NOT NULL,
    type TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS stt_uid
    ON stt (uid);
`
);

export default (uid, lang, text, pitch, type, time) =>
  run(
    `
    INSERT INTO stt (
      uid, lang, text, pitch, type, time
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [uid, lang, text, pitch, type, time],
    time
  );
