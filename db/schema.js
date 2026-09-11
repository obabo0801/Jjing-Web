export default `
  CREATE TABLE IF NOT EXISTS chatting (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    uid TEXT NOT NULL,
    text TEXT NOT NULL,
    system TEXT,
    image TEXT,
    preview TEXT,
    audio TEXT,
    attachments TEXT,
    deleted TEXT,
    deleted_by TEXT,
    time TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE INDEX IF NOT EXISTS chatting_time ON chatting (time, seq);
  CREATE INDEX IF NOT EXISTS chatting_uid ON chatting (uid, seq);

  CREATE TABLE IF NOT EXISTS report (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('user', 'message')),
    reporter TEXT NOT NULL,
    target TEXT NOT NULL,
    message TEXT,
    text TEXT,
    reason TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    time TEXT NOT NULL DEFAULT (datetime('now', '+9 hours')),
    CHECK (reporter <> target),
    CHECK ((type = 'user' AND message IS NULL AND text IS NULL)
      OR (type = 'message' AND message IS NOT NULL AND text IS NOT NULL))
  );

  CREATE INDEX IF NOT EXISTS report_target ON report (target, seq);

  CREATE TABLE IF NOT EXISTS sanction (
    uid TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    muted TEXT,
    notice TEXT,
    kicked TEXT,
    reason TEXT,
    time TEXT
  );

  CREATE TABLE IF NOT EXISTS user (
    uid TEXT PRIMARY KEY,
    id TEXT,
    name TEXT,
    email TEXT,
    image TEXT,
    avatar TEXT,
    consent TEXT,
    setup INTEGER NOT NULL DEFAULT 0
      CHECK (setup IN (0, 1)),
    role INTEGER NOT NULL DEFAULT 0
      CHECK (role IN (-2, -1, 0)),
    ip TEXT NOT NULL,
    initial TEXT,
    lang TEXT,
    date TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE TABLE IF NOT EXISTS block (
    uid TEXT,
    ip TEXT,
    reason TEXT,
    actor TEXT,
    handler TEXT,
    log INTEGER NOT NULL DEFAULT 0
      CHECK (log IN (0, 1)),
    time TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE TABLE IF NOT EXISTS draft (
    uid TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE,
    email TEXT NOT NULL,
    image TEXT,
    avatar TEXT,
    time TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE TABLE IF NOT EXISTS authority (
    uid TEXT PRIMARY KEY,
    memo TEXT,
    time TEXT,
    actor TEXT,
    handler TEXT
  );

  CREATE TABLE IF NOT EXISTS web (
    uid TEXT NOT NULL,
    endpoint TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    time TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE TABLE IF NOT EXISTS fcm (
    uid TEXT NOT NULL,
    fid TEXT PRIMARY KEY,
    device TEXT NOT NULL
      CHECK (device IN ('android', 'ios', 'wearable')),
    time TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE TABLE IF NOT EXISTS tts (
    file TEXT NOT NULL,
    uid TEXT NOT NULL,
    text TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stt (
    file TEXT NOT NULL,
    uid TEXT NOT NULL,
    text TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS user_ip
    ON user (ip);

  CREATE UNIQUE INDEX IF NOT EXISTS user_name
    ON user (name COLLATE NOCASE)
    WHERE name IS NOT NULL
      AND trim(name) <> '';

  CREATE UNIQUE INDEX IF NOT EXISTS draft_name
    ON draft (name COLLATE NOCASE);

  CREATE INDEX IF NOT EXISTS block_uid
    ON block (uid);

  CREATE INDEX IF NOT EXISTS block_ip
    ON block (ip);

  CREATE INDEX IF NOT EXISTS web_uid
    ON web (uid);

  CREATE INDEX IF NOT EXISTS fcm_uid
    ON fcm (uid);

  CREATE INDEX IF NOT EXISTS tts_file
    ON tts (file);

  CREATE INDEX IF NOT EXISTS tts_uid
    ON tts (uid);

  CREATE INDEX IF NOT EXISTS stt_file
    ON stt (file);

  CREATE INDEX IF NOT EXISTS stt_uid
    ON stt (uid);
`;
