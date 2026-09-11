export const schema = `
  CREATE TABLE IF NOT EXISTS audit.block (
    uid TEXT NOT NULL,
    ip TEXT,
    action TEXT NOT NULL CHECK (action IN ('block', 'unblock')),
    reason TEXT,
    actor TEXT NOT NULL,
    handler TEXT NOT NULL,
    time TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS audit.block_uid ON block (uid, time);

  CREATE TABLE IF NOT EXISTS audit.sanction (
    uid TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('mute', 'kick', 'unkick')),
    reason TEXT NOT NULL,
    actor TEXT NOT NULL,
    handler TEXT NOT NULL,
    time TEXT NOT NULL,
    until TEXT
  );
  CREATE INDEX IF NOT EXISTS audit.sanction_uid ON sanction (uid, time);
`;

export default (run, user, actor, action, reason, time) =>
  run(
    `INSERT INTO audit.block (uid, ip, action, reason, actor, handler, time)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user.uid,
      user.ip,
      action,
      reason,
      actor.uid,
      actor.name || actor.uid,
      time
    ]
  );
