import webpush from "web-push";
import { run } from "../db/index.js";

const key = process.env.VAPID_PUBLIC_KEY;
const secret = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

export const enabled = Boolean(key && secret && subject);

if (enabled) {
  webpush.setVapidDetails(subject, key, secret);
}

export { key };
export default webpush;

export const send = async (rows, value) => {
  let sent = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          JSON.parse(row.data),
          JSON.stringify(value),
          { TTL: 300, timeout: 5000 }
        );
        sent += 1;
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) {
          await run(
            `
            DELETE FROM web
            WHERE endpoint = ?
          `,
            [row.endpoint]
          );

          return;
        }

        failed += 1;
      }
    })
  );

  return { sent, failed };
};
