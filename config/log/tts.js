import log from "#config/log";

const run = log(
  "tts",
  `
  CREATE TABLE IF NOT EXISTS tts (
    uid TEXT NOT NULL,
    text TEXT NOT NULL,
    voice TEXT NOT NULL,
    type TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS tts_uid
    ON tts (uid);
`
);

export default (uid, text, voice, type, time) =>
  run(
    `
    INSERT INTO tts (
      uid, text, voice, type, time
    )
    VALUES (?, ?, ?, ?, ?)
  `,
    [uid, text, voice, type, time],
    time
  );
