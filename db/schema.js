export default `
  CREATE TABLE IF NOT EXISTS upload (
    file TEXT NOT NULL,
    uid TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT (datetime('now', '+9 hours')),
    PRIMARY KEY(file, uid)
  );
  CREATE INDEX IF NOT EXISTS upload_uid ON upload (uid);
  CREATE TABLE IF NOT EXISTS message_asset (
    seq INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    kind TEXT NOT NULL,
    url TEXT NOT NULL,
    preview TEXT,
    name TEXT,
    size INTEGER,
    PRIMARY KEY(seq, slot)
  );
  CREATE INDEX IF NOT EXISTS message_asset_kind
    ON message_asset(kind, seq DESC);
  CREATE TABLE IF NOT EXISTS room (
    id TEXT PRIMARY KEY,
    first TEXT NOT NULL,
    second TEXT NOT NULL,
    closed TEXT,
    departed TEXT,
    multiple INTEGER NOT NULL DEFAULT 0,
    owner TEXT,
    name TEXT
  );
  CREATE TABLE IF NOT EXISTS contact (
    room TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    handler TEXT,
    assigned TEXT,
    closed TEXT
  );
  CREATE TABLE IF NOT EXISTS room_member (
    room TEXT NOT NULL,
    uid TEXT NOT NULL,
    left TEXT,
    reason TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    muted INTEGER NOT NULL DEFAULT 0,
    deputy INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(room, uid)
  );
  CREATE INDEX IF NOT EXISTS room_member_user ON room_member(uid, room);
  CREATE TABLE IF NOT EXISTS message_receipt (
    message TEXT NOT NULL,
    uid TEXT NOT NULL,
    read TEXT,
    PRIMARY KEY(message, uid)
  );
  CREATE INDEX IF NOT EXISTS message_receipt_user ON message_receipt(uid, message);
  CREATE TABLE IF NOT EXISTS user_block (
    uid TEXT NOT NULL,
    peer TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT (datetime('now', '+9 hours')),
    PRIMARY KEY(uid, peer)
  );
  CREATE TABLE IF NOT EXISTS chatting_asset (
    seq INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    kind TEXT NOT NULL,
    url TEXT NOT NULL,
    preview TEXT,
    name TEXT,
    size INTEGER,
    PRIMARY KEY(seq, slot)
  );
  CREATE INDEX IF NOT EXISTS chatting_asset_kind
    ON chatting_asset(kind, seq DESC);
  CREATE TABLE IF NOT EXISTS conversation (
    uid TEXT NOT NULL,
    peer TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0,
    muted INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(uid, peer)
  );
  CREATE TABLE IF NOT EXISTS message (
    seq INTEGER PRIMARY KEY,
    id TEXT NOT NULL UNIQUE,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    room TEXT,
    system TEXT,
    text TEXT NOT NULL,
    read TEXT,
    deleted TEXT,
    attachments TEXT,
    audio TEXT,
    time TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
  );
  CREATE INDEX IF NOT EXISTS message_recipient ON message(recipient, seq);
  CREATE INDEX IF NOT EXISTS message_sender ON message(sender, seq);

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
    snapshot TEXT,
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
    session TEXT,
    deletion INTEGER,
    recovery TEXT,
    recovery_until INTEGER,
    erased INTEGER NOT NULL DEFAULT 0,
    name TEXT,
    email TEXT,
      google TEXT,
      settings TEXT CHECK (settings IS NULL OR json_valid(settings)),
    renamed TEXT,
    image TEXT,
    avatar TEXT,
    consent TEXT,
    draft TEXT CHECK (draft IS NULL OR json_valid(draft)),
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

  CREATE TABLE IF NOT EXISTS profile_file (
    uid TEXT NOT NULL,
    file TEXT NOT NULL,
    PRIMARY KEY(uid, file)
  );

  CREATE TABLE IF NOT EXISTS authority (
    uid TEXT PRIMARY KEY,
    memo TEXT,
    time TEXT,
    actor TEXT,
    handler TEXT
  );

  CREATE TABLE IF NOT EXISTS web (
      registered TEXT,
      uid TEXT NOT NULL,
      id TEXT,
      name TEXT,
      device TEXT,
      os TEXT,
      browser TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      connected INTEGER NOT NULL DEFAULT 1,
    endpoint TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    time TEXT NOT NULL
      DEFAULT (datetime('now', '+9 hours'))
  );

  CREATE TABLE IF NOT EXISTS fcm (
    registered TEXT,
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

  CREATE UNIQUE INDEX IF NOT EXISTS user_draft_name
    ON user (json_extract(draft, '$.name') COLLATE NOCASE)
    WHERE draft IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS user_id ON user (id);
  CREATE UNIQUE INDEX IF NOT EXISTS user_session ON user (session);

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
