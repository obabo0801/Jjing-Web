import { usage, user } from "#config/route";

import format from "#common/format";
import api from "#common/api";
import * as storage from "#common/storage";

const clearRequests = () => {
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
      const transaction = database.transaction(
        "requests",
        "readwrite"
      );

      const finish = () => {
        database.close();
        resolve();
      };

      transaction.objectStore("requests").clear();

      transaction.oncomplete = finish;
      transaction.onerror = finish;
      transaction.onabort = finish;
    };

    request.onerror = () => resolve();
  });
};

export const sizeCookie = async () => {
  const response = await api(`${user}${usage}`);

  return Number(response.data?.size) || 0;
};

export const sizeData = async () => {
  const storage = await navigator.storage?.estimate();

  return Number(storage?.usage) || 0;
};

export const sizeAll = async () => {
  const [cookie, data] = await Promise.all([
    sizeCookie(),
    sizeData()
  ]);

  return {
    cookie: format(cookie),
    data: format(data),
    total: format(cookie + data)
  };
};

export const clearCookie = async () => {
  const response = await api(user, { method: "DELETE" });

  return response.ok;
};

export const clearData = async () => {
  storage.clear();

  await Promise.all([
    "caches" in window ? caches.delete("offline") : false,
    clearRequests()
  ]);

  return true;
};

export default Object.freeze({
  sizeCookie,
  sizeData,
  sizeAll,
  clearCookie,
  clearData
});
