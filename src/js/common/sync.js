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
    let finished = false;

    const finish = (error) => {
      if (finished) return;
      finished = true;
      database.close();
      if (error) reject(error);
      else resolve();
    };

    try {
      const transaction = database.transaction("requests", "readwrite");
      const fail = () =>
        finish(transaction.error || new Error("Request queue save failed"));

      transaction.oncomplete = () => finish();
      transaction.onerror = fail;
      transaction.onabort = fail;
      transaction.objectStore("requests").add(value);
    } catch (error) {
      finish(error);
    }
  });
};

export default async function sync(path, { data, ...options } = {}) {
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

  await saveRequest(request);

  // Worker가 준비되지 않아도 저장된 요청은 큐에 남기고 반환합니다.
  try {
    const registration = await navigator.serviceWorker?.getRegistration();

    if (registration?.active) {
      if ("sync" in registration) {
        try {
          await registration.sync.register("api-sync");
        } catch {
          registration.active.postMessage({ type: "sync" });
        }
      } else {
        registration.active.postMessage({ type: "sync" });
      }
    }
  } catch {}

  return null;
}
