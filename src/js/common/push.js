import * as pwa from "#src/pwa";

const supported = (registration) =>
  Boolean(
    registration &&
    "Notification" in window &&
    "PushManager" in window
  );

const authorize = async () => {
  if (Notification.permission !== "default") {
    return Notification.permission === "granted";
  }

  try {
    return (
      (await Notification.requestPermission()) === "granted"
    );
  } catch {
    return false;
  }
};

export const enabled = async (registration) => {
  if (!supported(registration)) {
    return false;
  }

  try {
    return await pwa.active(registration);
  } catch {
    return false;
  }
};

export default async function push(enable, registration) {
  if (!supported(registration)) {
    return false;
  }

  try {
    if (!enable) {
      const removed = await pwa.unsubscribe(registration);

      if (removed) {
        return false;
      }

      return await pwa.active(registration);
    }

    if (!(await authorize())) {
      return false;
    }

    return await pwa.subscribe(registration);
  } catch {
    return enabled(registration);
  }
}
