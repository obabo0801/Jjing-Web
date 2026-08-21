import { on } from "#common/event";
import { show } from "#common/dialog";
import overlay from "#common/overlay";

import { active, subscribe, unsubscribe } from "#src/pwa";

import { notification } from "#ui/dialog";

const supported = (registration) =>
  Boolean(registration && "Notification" in window && "PushManager" in window);

const permission = async () => {
  try {
    return await navigator.permissions?.query({ name: "notifications" });
  } catch {
    return null;
  }
};

const wait = async () => {
  const { confirm, view } = notification;
  const access = await permission();

  show(view, { backdrop: false });

  return new Promise((resolve) => {
    let settled = false;
    let offCancel = () => {};
    let offConfirm = () => {};
    let offAccess = () => {};
    let offFocus = () => {};

    const finish = (value) => {
      if (settled) {
        return;
      }

      settled = true;
      offCancel();
      offConfirm();
      offAccess();
      offFocus();

      if (view.open) {
        view.close();
      }

      resolve(value);
    };

    const check = () => {
      if (Notification.permission === "granted") {
        finish(true);
      }
    };

    offCancel = on(view, "cancel", (event) => {
      event.preventDefault();
    });
    offConfirm = on(confirm, "click", () => finish(false));
    offAccess = on(access, "change", check);
    offFocus = on(window, "focus", check);

    check();
  });
};

const authorize = async () => {
  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "default") {
    overlay.open();

    try {
      if ((await Notification.requestPermission()) === "granted") {
        return true;
      }
    } finally {
      overlay.close();
    }
  }

  return wait();
};

export const enabled = async (registration) => {
  try {
    return supported(registration) && (await active(registration));
  } catch {
    return false;
  }
};

export default async function push(value, registration) {
  if (!supported(registration)) {
    return false;
  }

  try {
    if (!value) {
      const removed = await unsubscribe(registration);

      return removed ? false : await active(registration);
    }

    if (!(await authorize())) {
      return false;
    }

    return await subscribe(registration);
  } catch {
    return enabled(registration);
  }
}
