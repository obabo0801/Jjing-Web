import { i18n, payload, push } from "#config/route";

import { on } from "#common/event";
import api from "#common/api";

const open = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("sync", 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("requests")) {
        database.createObjectStore("requests", {
          keyPath: "id",
          autoIncrement: true
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

const save = async (value) => {
  const database = await open();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction("requests", "readwrite");

    transaction.objectStore("requests").add(value);

    transaction.oncomplete = resolve;
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

const decode = (value) => {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);

  const base64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");

  return Uint8Array.from(atob(base64), (value) => value.charCodeAt(0));
};

export async function subscribe(registration) {
  if (
    !import.meta.env.PROD ||
    !registration ||
    !("Notification" in window) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  const key = await api(push);

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

  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decode(key.data.key)
    }));

  const result = await api(push, { method: "POST", data: { subscription } });

  return result.ok;
}

export default async function pwa() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
    return;
  }

  await navigator.serviceWorker.register("/service-work.js", { scope: "/" });

  const registration = await navigator.serviceWorker.ready;

  const cache = () => {
    registration.active?.postMessage({
      type: "offline",
      locale: `/api${i18n}`,
      payload
    });
  };

  const installed =
    matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;

  if (installed) {
    cache();
  }

  on(window, "appinstalled", cache, { once: true });

  on(window, "online", () => {
    registration.active?.postMessage({ type: "sync" });
  });

  return registration;
}

export async function notify(title, options = {}) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return false;
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification(title, {
    icon: "/icons/icon-192.png",
    ...options
  });

  return true;
}

export async function sync(path, { data, ...options } = {}) {
  const request = {
    url: `/api${path}`,
    options: {
      ...options,

      ...(data !== undefined && {
        headers: { "Content-Type": "application/json", ...options.headers },
        body: JSON.stringify(data)
      })
    }
  };

  try {
    const response = await fetch(request.url, request.options);

    if (response.ok || response.status < 500) {
      return response;
    }
  } catch {}

  await save(request);

  const registration = await navigator.serviceWorker.ready;

  if ("sync" in registration) {
    await registration.sync.register("api-sync");
  } else {
    registration.active?.postMessage({ type: "sync" });
  }

  return null;
}
