import * as route from "#config/route";

import * as dom from "#common/dom";
import api from "#common/api";
import toast from "#common/toast";

const openDatabase = () =>
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

const saveRequest = async (value) => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      "requests",
      "readwrite"
    );

    transaction.objectStore("requests").add(value);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      const { error } = transaction;

      database.close();
      reject(error);
    };
  });
};

const decodeKey = (value) => {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + pad)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0)
  );
};

const status = (subscription) =>
  api(route.push, {
    method: "PUT",
    data: { endpoint: subscription.endpoint }
  });

export async function active(registration) {
  if (
    !registration ||
    !("Notification" in window) ||
    !("PushManager" in window) ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    return false;
  }

  const result = await status(subscription);

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

  const saved =
    await registration.pushManager.getSubscription();

  if (saved) {
    const result = await status(saved);

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

  const subscription =
    await registration.pushManager.subscribe({
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

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    return true;
  }

  const { endpoint } = subscription;
  const removed = await subscription.unsubscribe();

  await api(route.push, {
    method: "DELETE",
    data: { endpoint }
  });

  return removed;
}

export async function load() {
  if (
    !import.meta.env.PROD ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  await navigator.serviceWorker.register(
    "/service-work.js",
    { scope: "/" }
  );

  const registration = await navigator.serviceWorker.ready;

  dom.on(navigator.serviceWorker, "message", (event) => {
    if (
      event.data?.type !== "notify" ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    const { title, body, image, url } = event.data.data;
    const options = { title, text: body, image, url };

    toast({ type: "notify", ...options });
  });

  const cache = () => {
    registration.active?.postMessage({
      type: "offline",
      locale: `/api${route.i18n}`,
      content: route.content
    });
  };

  const standalone = matchMedia(
    "(display-mode: standalone)"
  ).matches;

  if (navigator.standalone || standalone) {
    cache();
  }

  dom.on(window, "appinstalled", cache, { once: true });
  dom.on(window, "online", () =>
    registration.active?.postMessage({ type: "sync" })
  );

  return registration;
}

export async function notify(title, options = {}) {
  if (
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
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

export async function sync(
  path,
  { data, ...options } = {}
) {
  const request = {
    url: `/api${path}`,
    options: {
      ...options,
      ...(data !== undefined && {
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        },
        body: JSON.stringify(data)
      })
    }
  };

  try {
    const response = await fetch(
      request.url,
      request.options
    );

    if (response.ok || response.status < 500) {
      return response;
    }
  } catch {}

  await saveRequest(request);

  const registration = await navigator.serviceWorker.ready;

  if ("sync" in registration) {
    await registration.sync.register("api-sync");
  } else {
    registration.active?.postMessage({ type: "sync" });
  }

  return null;
}
