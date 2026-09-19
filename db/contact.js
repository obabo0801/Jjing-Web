export default async function migrate(db) {
  const columns = await db.all("PRAGMA table_info(contact)");

  if (!columns.some((column) => column.name === "closed")) {
    await db.exec("BEGIN IMMEDIATE");
    try {
      await db.exec(`
        CREATE TABLE contact_next (
          room TEXT PRIMARY KEY, uid TEXT NOT NULL,
          handler TEXT, assigned TEXT, closed TEXT
        );
        INSERT INTO contact_next(room,uid,handler,assigned,closed)
          SELECT c.room,c.uid,c.handler,c.assigned,coalesce(r.closed,m.left)
          FROM contact c JOIN room r ON r.id = c.room
          LEFT JOIN room_member m ON m.room = c.room AND m.uid = c.uid;
        DROP TABLE contact;
        ALTER TABLE contact_next RENAME TO contact;
        UPDATE room SET closed = (SELECT c.closed FROM contact c WHERE c.room = room.id)
          WHERE id IN (SELECT room FROM contact WHERE closed IS NOT NULL);
        COMMIT;
      `);
    } catch (error) {
      await db.exec("ROLLBACK");
      throw error;
    }
  }

  await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS contact_active
    ON contact(uid) WHERE closed IS NULL`);
}
