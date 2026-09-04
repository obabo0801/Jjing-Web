const ids = new WeakMap();
const messages = new Set();

const bind = (items, element, uid) => {
  if (!uid) {
    return;
  }

  ids.set(element, uid);
  items.add(element);
};

const find = (items, uid) => {
  const result = [];

  for (const element of items) {
    if (!element.isConnected) {
      items.delete(element);
    } else if (ids.get(element) === uid) {
      result.push(element);
    }
  }

  return result;
};

export const message = (element, uid) =>
  bind(messages, element, uid);

export const messageAll = (uid) => find(messages, uid);
