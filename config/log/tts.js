import log from "#config/log";

const run = log("tts", `
  CREATE TABLE IF NOT EXISTS tts (
    uid TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS tts_uid
    ON tts (uid);
`);

export default (uid, text, type, time) =>
  run(`
    INSERT INTO tts (
      uid, text, type, time
    )
    VALUES (?, ?, ?, ?)
  `, [uid, text, type, time], time);
