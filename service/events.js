import { publicId } from "#config/uid";
import { randomUUID } from "node:crypto";
import { all } from "#db";
import * as media from "#config/media";

const clients = new Map();
const contexts = new WeakMap();
const tabs = new Map();
const idle = 10 * 60 * 1000;
const resume = 60_000;

let order = 0;

const status = (session) =>
  Date.now() - session.active >= idle ? "away" : "online";

const write = (response, type, data = {}) => {
  if (response.writableEnded || response.destroyed) return;
  response.write(`event: ${type}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

const current = (item) => {
  if (!item?.responses.size) {
    return "offline";
  }

  return [...item.responses].some(
    (response) => status(contexts.get(response)) === "online"
  )
    ? "online"
    : "away";
};

export const broadcast = (type, data) => {
  clients.forEach((item) => {
    item.responses.forEach((response) => write(response, type, data));
  });
  if (type === "profile-update") broadcast("online");
};

const update = (uid, item) => {
  const state = current(item);

  if (item.state === state) {
    return;
  }

  item.state = state;
  broadcast("presence", { id: publicId(uid), state });
};

export const state = (uid) => current(clients.get(uid));

export const touch = (uid, session) => {
  const item = clients.get(uid);

  if (!item) {
    return false;
  }

  for (const response of item.responses) {
    const context = contexts.get(response);

    if (context.session !== session) continue;
    context.active = Date.now();
    if (context.state !== "online") {
      context.state = "online";
      update(uid, item);
      broadcast("online");
    }
    return true;
  }
  return false;
};

export const list = async () => {
  const ids = [...clients.keys()];
  const users = new Map();

  for (let start = 0; start < ids.length; start += 256) {
    const keys = ids.slice(start, start + 256);
    const rows = await all(
      `SELECT uid, id, name, avatar, role FROM user
        WHERE uid IN (${keys.map(() => "?").join(",")}) AND setup = 1
        AND NOT EXISTS (SELECT 1 FROM block
          WHERE block.uid = user.uid OR block.ip = user.ip)
        AND NOT EXISTS (SELECT 1 FROM sanction WHERE uid = user.uid
          AND kicked > datetime('now', '+9 hours'))`,
      keys
    );

    for (const user of rows) users.set(user.uid, user);
  }
  const items = [];

  clients.forEach((item, uid) => {
    const user = users.get(uid);

    if (!user) return;
    for (const response of item.responses) {
      if (response.writableEnded || response.destroyed) continue;
      const context = contexts.get(response);

      items.push({
        session: context.tab.id,
        order: context.tab.order,
        id: user.id || publicId(uid),
        name: user.name || "",
        avatar: media.resolve(user.avatar),
        group: user.role < 0 ? "admin" : "user",
        state: status(context)
      });
    }
  });
  return { items };
};

export const send = (uid, type, data) => {
  clients
    .get(uid)
    ?.responses.forEach((response) => write(response, type, data));
};

export const disconnect = (uid) => {
  const item = clients.get(uid);

  if (!item) return;
  const responses = [...item.responses];

  item.responses.clear();
  clients.delete(uid);
  for (const [key, tab] of tabs) {
    if (tab.uid === uid) tabs.delete(key);
  }
  for (const response of responses) {
    contexts.delete(response);
    if (!response.writableEnded && !response.destroyed) response.end();
  }
  update(uid, item);
  broadcast("online");
};

// 수신 시점의 권한과 접속 IP로 응답마다 공개 데이터를 결정합니다.
export const publish = async (type, resolve) => {
  const deliveries = [];

  clients.forEach((item) =>
    item.responses.forEach((response) => {
      deliveries.push(
        (async () => {
          const data = await resolve(contexts.get(response));

          if (data && item.responses.has(response)) write(response, type, data);
        })()
      );
    })
  );
  await Promise.allSettled(deliveries);
};

export const connect = (user, response) => {
  const key = `${user.uid}:${user.tab || randomUUID()}`;

  let tab = tabs.get(key);

  if (!tab || (!tab.response && tab.expires <= Date.now())) {
    tab = { uid: user.uid, id: randomUUID(), order: ++order };
    tabs.set(key, tab);
  }
  const context = {
    ...user,
    tab,
    session: randomUUID(),
    active: Date.now(),
    state: "online"
  };

  contexts.set(response, context);
  const item = clients.get(user.uid) ?? {
    responses: new Set(),
    state: "offline"
  };

  // 재연결은 같은 탭의 연결만 교체합니다. 늦은 close는 새 연결과 무관합니다.
  const previous = tab.response;

  if (previous) {
    item.responses.delete(previous);
    contexts.delete(previous);
    if (!previous.writableEnded && !previous.destroyed) previous.end();
  }
  tab.response = response;
  tab.expires = 0;
  item.responses.add(response);
  clients.set(user.uid, item);
  let closed = false;

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;
    contexts.delete(response);
    if (!item.responses.delete(response)) return;

    if (tab.response === response) {
      tab.response = null;
      tab.expires = Date.now() + resume;
    }
    update(user.uid, item);
    if (!item.responses.size) clients.delete(user.uid);
    broadcast("online");
  };

  response.once?.("close", close);
  response.once?.("error", close);
  write(response, "ready", {
    id: publicId(user.uid),
    session: context.session,
    role: user.role,
    state: current(item)
  });
  update(user.uid, item);
  broadcast("online");
  return close;
};

const timer = setInterval(() => {
  let changed = false;

  for (const [key, tab] of tabs) {
    if (!tab.response && tab.expires <= Date.now()) tabs.delete(key);
  }
  clients.forEach((item, uid) => {
    for (const response of item.responses) {
      const context = contexts.get(response);
      const next = status(context);

      if (context.state === next) continue;
      context.state = next;
      changed = true;
    }
    update(uid, item);
  });
  if (changed) broadcast("online");
}, 30_000);

timer.unref?.();
