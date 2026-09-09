import * as dom from "#common/dom";

import * as route from "#shared/route";
import api from "#common/api";

export const supported = (registration) =>
  Boolean(
    registration &&
    !dom.has("wearable") &&
    "Notification" in window &&
    "PushManager" in window
  );

const authorize = async () => {
  if (Notification.permission !== "default") {
    return Notification.permission === "granted";
  }

  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
};

export const enabled = async (registration) => {
  if (!supported(registration)) {
    return false;
  }

  try {
    return await active(registration);
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
      const removed = await unsubscribe(registration);

      if (removed) {
        return false;
      }

      return await active(registration);
    }

    if (!(await authorize())) {
      return false;
    }

    return await subscribe(registration);
  } catch {
    return enabled(registration);
  }
}

const decodeKey = (value) => {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");

  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

const refresh = (subscription) =>
  api(route.push, { method: "PUT", data: { subscription } });

export async function active(registration) {
  if (
    !registration ||
    !("Notification" in window) ||
    !("PushManager" in window) ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const saved = await api(route.push);

    if (!saved.data?.subscribed) {
      return false;
    }

    return subscribe(registration);
  }

  const result = await refresh(subscription);

  if (result.status === 404) {
    await subscription.unsubscribe().catch(() => false);
  }

  return result.ok;
}

export async function subscribe(registration) {
  if (
    !import.meta.env.PROD ||
    !registration ||
    !("Notification" in window) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  const key = await api(route.push);

  if (!key.ok || !key.data?.key) {
    return false;
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") {
    return false;
  }

  const saved = await registration.pushManager.getSubscription();

  if (saved) {
    const result = await refresh(saved);

    if (result.ok) {
      return true;
    }

    if (result.status !== 404) {
      return false;
    }

    if (!(await saved.unsubscribe())) {
      return false;
    }
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeKey(key.data.key)
  });

  const result = await api(route.push, {
    method: "POST",
    data: { subscription }
  });

  return result.ok;
}

export async function unsubscribe(registration) {
  if (!registration || !("PushManager" in window)) {
    return false;
  }

  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return true;
  }

  const { endpoint } = subscription;
  const removed = await subscription.unsubscribe();

  await api(route.push, { method: "DELETE", data: { endpoint } });

  return removed;
}

export async function notify(title, options = {}) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration?.active || !(await authorize())) {
      return false;
    }

    await registration.showNotification(title, {
      icon: "/icons/icon-192.png",
      ...options
    });

    return true;
  } catch {
    return false;
  }
}
