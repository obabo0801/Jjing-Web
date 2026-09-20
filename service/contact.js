import { randomUUID } from "node:crypto";
import * as db from "#db";
import * as role from "#shared/role";
import { validId } from "#shared/chatting";

const fail = () => {
  throw Object.assign(new Error("Contact unavailable"), { status: 404 });
};

export const sync = async (id = "") => {
  await db.run(
    `UPDATE contact SET handler = NULL, assigned = NULL
    WHERE closed IS NULL AND handler IS NOT NULL AND (? = '' OR room = ?)
      AND NOT EXISTS (SELECT 1 FROM user WHERE uid = contact.handler
        AND role IN (?,?) AND erased = 0 AND deletion IS NULL)`,
    [id, id, role.root, role.admin]
  );

  await db.run(
    `INSERT OR IGNORE INTO room_member(room,uid)
    SELECT c.room,u.uid FROM contact c JOIN user u
      ON u.uid = c.uid OR u.role IN (?,?)
    WHERE u.erased = 0 AND u.deletion IS NULL AND c.closed IS NULL
      AND (? = '' OR c.room = ?)`,
    [role.root, role.admin, id, id]
  );

  await db.run(
    `UPDATE room_member SET left = NULL, reason = NULL
    WHERE room IN (SELECT room FROM contact WHERE closed IS NULL AND (? = '' OR room = ?))
      AND uid IN (SELECT uid FROM user WHERE role IN (?,?)
        AND erased = 0 AND deletion IS NULL)
      AND uid <> (SELECT uid FROM contact WHERE contact.room = room_member.room)`,
    [id, id, role.root, role.admin]
  );

  await db.run(
    `INSERT OR IGNORE INTO message_receipt(message,uid,read)
    SELECT m.id,r.uid,NULL FROM message m
    JOIN contact c ON c.room = m.room
    JOIN room_member r ON r.room = c.room
    JOIN user u ON u.uid = r.uid
    WHERE r.left IS NULL AND u.erased = 0 AND u.deletion IS NULL
      AND (u.uid = c.uid OR u.role IN (?,?)) AND (? = '' OR c.room = ?)`,
    [role.root, role.admin, id, id]
  );
};

const resolve = async (user, id, create) => {
  const viewer = await db.get(
    "SELECT uid,role FROM user WHERE uid = ? AND erased = 0 AND deletion IS NULL",
    [user.uid]
  );

  if (!viewer || (id && !validId(id))) fail();
  let row = await db.get(
    `SELECT * FROM contact WHERE ${id ? "room = ?" : "uid = ? AND closed IS NULL"}`,
    [id || user.uid]
  );

  if (id && (!row || (row.uid !== user.uid && !role.staff(viewer.role)))) fail();

  if (row?.closed) return { id: row.room };

  if (!row && !create) {
    return {
      id: "contact",
      contact: true,
      draft: true,
      available: true,
      requester: { self: true },
      handler: null,
      participants: []
    };
  }

  if (!row) {
    const room = randomUUID();

    await db.run("INSERT INTO room(id,first,second,multiple) VALUES(?,?,?,1)", [
      room,
      user.uid,
      user.uid
    ]);

    await db.run("INSERT INTO contact(room,uid) VALUES(?,?)", [room, user.uid]);
    row = { room, uid: user.uid };
  }

  await sync(row.room);
  await db.run("UPDATE room_member SET left = NULL, reason = NULL WHERE room = ? AND uid = ?", [
    row.room,
    user.uid
  ]);

  if (row.uid !== user.uid && role.staff(viewer.role)) {
    await db.run(
      `UPDATE contact SET handler = ?, assigned = datetime('now','+9 hours')
        WHERE room = ? AND handler IS NULL`,
      [user.uid, row.room]
    );
  }

  return { id: row.room };
};

export const open = (user, id = "") => db.transaction(() => resolve(user, id, false));

// 첫 메시지 저장 트랜잭션 안에서 문의도 함께 생성합니다.
export const ensure = (user) => resolve(user, "", true);
