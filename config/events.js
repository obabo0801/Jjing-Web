const clients = new Map();
const idle = 10 * 60 * 1000;

const write = (response, type, data = {}) => {
  response.write(`event: ${type}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

const current = (item) => {
  if (!item?.responses.size) {
    return "offline";
  }

  return Date.now() - item.active >= idle
    ? "away"
    : "online";
};

const update = (uid, item) => {
  const state = current(item);

  if (item.state === state) {
    return;
  }

  item.state = state;
  broadcast("presence", { uid, state });
};

export const state = (uid) => current(clients.get(uid));

export const touch = (uid) => {
  const item = clients.get(uid);

  if (!item) {
    return false;
  }

  item.active = Date.now();
  update(uid, item);

  return true;
};

export const send = (uid, type, data) => {
  clients
    .get(uid)
    ?.responses.forEach((response) =>
      write(response, type, data)
    );
};

export const broadcast = (type, data) => {
  clients.forEach((item) => {
    item.responses.forEach((response) =>
      write(response, type, data)
    );
  });
};

export const connect = (user, response) => {
  const item = clients.get(user.uid) ?? {
    responses: new Set(),
    active: Date.now(),
    state: "offline"
  };

  item.responses.add(response);
  item.active = Date.now();
  clients.set(user.uid, item);
  write(response, "ready", {
    uid: user.uid,
    role: user.role,
    state: current(item)
  });
  update(user.uid, item);

  let closed = false;

  return () => {
    if (closed) {
      return;
    }

    closed = true;
    item.responses.delete(response);

    if (item.responses.size) {
      return;
    }

    update(user.uid, item);
    clients.delete(user.uid);
  };
};

const timer = setInterval(() => {
  clients.forEach((item, uid) => update(uid, item));
}, 30_000);

timer.unref?.();
