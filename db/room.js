import { randomUUID } from "node:crypto";

export default async function migrate(db) {
  const members = await db.all("PRAGMA table_info(room_member)");

  if (!members.some((item) => item.name === "deputy"))
    await db.exec(
      "ALTER TABLE room_member ADD COLUMN deputy INTEGER NOT NULL DEFAULT 0"
    );
  const columns = await db.all("PRAGMA table_info(room)");

  if (!columns.some((item) => item.name === "multiple")) {
    await db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE room_next (
        id TEXT PRIMARY KEY, first TEXT NOT NULL, second TEXT NOT NULL,
        closed TEXT, departed TEXT, multiple INTEGER NOT NULL DEFAULT 0,
        owner TEXT, name TEXT
      );
      INSERT INTO room_next(id,first,second,closed,departed)
        SELECT id,first,second,closed,departed FROM room;
      DROP TABLE room;
      ALTER TABLE room_next RENAME TO room;
      COMMIT;`);
  }
  await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS room_pair
    ON room(first,second) WHERE multiple = 0`);
  const pairs = await db.all(`SELECT DISTINCT
    min(sender,recipient) AS first, max(sender,recipient) AS second
    FROM message WHERE room IS NULL`);

  for (const pair of pairs) {
    await db.run(`INSERT OR IGNORE INTO room(id,first,second) VALUES(?,?,?)`, [
      randomUUID(),
      pair.first,
      pair.second
    ]);

    await db.run(
      `UPDATE message SET room = (SELECT id FROM room
      WHERE first = ? AND second = ? AND multiple = 0)
      WHERE room IS NULL AND min(sender,recipient) = ?
      AND max(sender,recipient) = ?`,
      [pair.first, pair.second, pair.first, pair.second]
    );
  }
  await db.exec(`
    INSERT OR IGNORE INTO room_member(room,uid,left,reason)
      SELECT id,first,CASE WHEN departed = first THEN closed END,
        CASE WHEN departed = first THEN 'leave' END FROM room;
    INSERT OR IGNORE INTO room_member(room,uid,left,reason)
      SELECT id,second,CASE WHEN departed = second THEN closed END,
        CASE WHEN departed = second THEN 'leave' END FROM room;
    INSERT OR IGNORE INTO message_receipt(message,uid,read)
      SELECT id,sender,time FROM message;
    INSERT OR IGNORE INTO message_receipt(message,uid,read)
      SELECT id,recipient,read FROM message;
    UPDATE room_member SET
      pinned = COALESCE((SELECT pinned FROM conversation c JOIN room r
        ON r.id = room_member.room WHERE c.uid = room_member.uid
        AND c.peer = CASE WHEN r.first = c.uid THEN r.second ELSE r.first END),
        pinned),
      muted = COALESCE((SELECT muted FROM conversation c JOIN room r
        ON r.id = room_member.room WHERE c.uid = room_member.uid
        AND c.peer = CASE WHEN r.first = c.uid THEN r.second ELSE r.first END),
        muted);
    DELETE FROM conversation;
  `);
}
