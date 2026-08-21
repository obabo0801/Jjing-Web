const offline = "offline";
const page = "/offline";

const prepare = async (locale, payload) => {
  const response = await fetch(page, {
    cache: "no-store",
    headers: { "x-pwa-cache": "true" }
  });

  if (!response.ok) {
    throw new Error();
  }

  const html = await response.clone().text();

  const files = new Set(
    [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
      .map(([, file]) => new URL(file, self.location.origin))
      .filter((url) => url.origin === self.location.origin)
      .map((url) => `${url.pathname}${url.search}`)
  );

  if (locale && payload) {
    const url = new URL(locale, self.location.origin);

    if (url.origin !== self.location.origin) {
      throw new Error();
    }

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error();
    }

    const body = await response.json();
    const value = body?.[payload];

    if (typeof value !== "string") {
      throw new Error();
    }

    const languages = JSON.parse(atob(value));
    const base = url.pathname.replace(/\/$/, "");

    files.add(base);

    Object.values(languages).forEach((file) => {
      files.add(`${base}/${file}`);
    });
  }

  const cache = await caches.open(offline);

  await cache.put(page, response);
  await cache.addAll([...files]);

  const keep = new Set([page, ...files]);

  const saved = await cache.keys();

  await Promise.all(
    saved.map((request) => {
      const url = new URL(request.url);

      const file = `${url.pathname}${url.search}`;

      if (file.startsWith("/assets/") && !keep.has(file)) {
        return cache.delete(request);
      }

      return true;
    })
  );
};

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

const records = async () => {
  const database = await open();

  return new Promise((resolve, reject) => {
    const request = database
      .transaction("requests")
      .objectStore("requests")
      .getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

const remove = async (id) => {
  const database = await open();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction("requests", "readwrite");

    transaction.objectStore("requests").delete(id);

    transaction.oncomplete = resolve;
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

const synchronize = async () => {
  for (const item of await records()) {
    const response = await fetch(item.url, item.options);

    if (response.status < 500) {
      await remove(item.id);
      continue;
    }

    throw new Error();
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === page) {
    event.respondWith(caches.match(page));

    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () => (await caches.match(page)) || Response.error()
      )
    );

    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(offline);

            await cache.put(request, response.clone());

            return response;
          }

          return response;
        })
        .catch(async () => (await caches.match(request)) || Response.error())
    );

    return;
  }

  event.respondWith(
    caches.match(request).then((response) => response || fetch(request))
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "api-sync") {
    event.waitUntil(synchronize());
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "sync") {
    event.waitUntil(synchronize());
  }

  if (event.data?.type === "offline") {
    event.waitUntil(prepare(event.data.locale, event.data.payload));
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "", body: "", url: "/" };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      data: { url: data.url }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(self.clients.openWindow(url));
});
