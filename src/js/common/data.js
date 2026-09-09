import { usage, user } from "#shared/route";

import format from "#common/format";
import api from "#common/api";
import * as storage from "#common/storage";

const clearRequests = () => {
  if (!("indexedDB" in window)) {
    return Promise.resolve(true);
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

      let finished = false;

      const finish = (success) => {
        if (finished) return;
        finished = true;
        database.close();
        resolve(success);
      };

      try {
        const transaction = database.transaction("requests", "readwrite");

        transaction.oncomplete = () => finish(true);
        transaction.onerror = () => finish(false);
        transaction.onabort = () => finish(false);
        transaction.objectStore("requests").clear();
      } catch {
        finish(false);
      }
    };
    request.onerror = () => resolve(false);
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
  const [cookie, data] = await Promise.all([sizeCookie(), sizeData()]);

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
  const cache = async () => {
    if ("caches" in window) await caches.delete("offline");
    // 캐시가 이미 없는 경우도 삭제 완료입니다.
    return true;
  };

  const results = await Promise.allSettled([
    storage.clear(),
    cache(),
    clearRequests()
  ]);

  return results.every(
    (result) => result.status === "fulfilled" && result.value === true
  );
};

export default Object.freeze({
  sizeCookie,
  sizeData,
  sizeAll,
  clearCookie,
  clearData
});
