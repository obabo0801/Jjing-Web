import { usage, user } from "#config/route";

import api from "#common/api";
import format from "#common/format";
import { clear as clearStorage } from "#common/storage";

const clearSync = () => {
  if (!("indexedDB" in window)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
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
      const database = request.result;
      const transaction = database.transaction("requests", "readwrite");

      transaction.objectStore("requests").clear();
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        resolve();
      };
    };

    request.onerror = () => resolve();
  });
};

export const size = async () => {
  const [cookie, storage] = await Promise.all([
    api(`${user}${usage}`),
    navigator.storage?.estimate() || {}
  ]);

  const cookieSize = Number(cookie.data?.size) || 0;
  const dataSize = Number(storage.usage) || 0;

  return {
    cookie: format(cookieSize),
    data: format(dataSize),
    total: format(cookieSize + dataSize)
  };
};

export const clearCookie = async () => {
  const result = await api(user, { method: "DELETE" });

  return result.ok;
};

export const clearData = async () => {
  clearStorage();

  await Promise.all([
    "caches" in window ? caches.delete("offline") : false,
    clearSync()
  ]);

  return true;
};
