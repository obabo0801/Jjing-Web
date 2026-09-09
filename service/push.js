import webpush from "web-push";

const key = process.env.VAPID_PUBLIC_KEY;
const secret = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

export const enabled = Boolean(key && secret && subject);

if (enabled) {
  webpush.setVapidDetails(subject, key, secret);
}

export { key };
export default webpush;
