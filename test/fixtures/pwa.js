export const state = { wearable: false, toasts: [] };
export const has = () => state.wearable;
export const on = (target, type, callback, options) =>
  target.addEventListener(type, callback, options);
export const toast = (value) => state.toasts.push(value);

// 페이지와 Worker의 큐 계약을 검사하기 위한 최소 IndexedDB 구현입니다.
export const database = ({ failure } = {}) => {
  const calls = [];
  const rows = [];

  let next = 1;

  const db = {
    objectStoreNames: { contains: () => false },
    createObjectStore: (name, options) => calls.push(["create", name, options]),
    close: () => calls.push(["close"]),
    transaction(name, mode) {
      calls.push(["transaction", name, mode]);
      if (failure === "transaction") throw new Error("transaction failed");
      const writes = [];
      const transaction = {
        objectStore(store) {
          calls.push(["store", store]);
          if (failure === "store") throw new Error("store failed");
          return {
            add(value) {
              if (failure === "add") throw new Error("add failed");
              writes.push(() => rows.push({ id: next++, ...value }));
            },
            getAll: () => ({ result: [...rows] }),
            clear() {
              if (failure === "clear") throw new Error("clear failed");
              writes.push(() => rows.splice(0));
            },
            delete(id) {
              writes.push(() => {
                const index = rows.findIndex((row) => row.id === id);

                if (index >= 0) rows.splice(index, 1);
              });
            }
          };
        }
      };

      queueMicrotask(() => {
        if (failure === "abort") return transaction.onabort?.();
        if (failure === "error") {
          transaction.error = new Error("transaction error");
          transaction.onerror?.();
          transaction.onabort?.();
          return;
        }
        writes.forEach((write) => write());
        transaction.oncomplete?.();
      });
      return transaction;
    }
  };

  const indexedDB = {
    open(name, version) {
      calls.push(["open", name, version]);
      if (failure === "open-throw") throw new Error("open failed");
      const request = { result: db };

      queueMicrotask(() => {
        if (failure === "open") {
          request.error = new Error("open failed");
          request.onerror?.();
          return;
        }
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    }
  };

  return { indexedDB, rows, calls };
};
