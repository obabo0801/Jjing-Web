import { profile as path } from "#config/route";

import api from "#common/api";
import upload from "#common/upload";

const records = new Map();
const pending = new Map();
const bindings = new Set();
const linkBindings = new Set();

let linked = "";

const key = (uid) => uid || "me";

const notify = (uid, user) => {
  for (const binding of bindings) {
    if (!binding.element.isConnected) {
      bindings.delete(binding);
    } else if (binding.uid === uid) {
      binding.render(user);
    }
  }
};

const remember = (uid, user) => {
  if (!user?.uid) {
    return user;
  }

  const value = { ...records.get(user.uid), ...user };

  records.set(user.uid, value);
  notify(user.uid, value);

  if (uid === "me" || value.self) {
    records.set("me", value);
    notify("me", value);
  }

  return value;
};

export const value = (uid = "me") => records.get(key(uid));

export const bind = (element, uid, render) => {
  const binding = { element, uid: key(uid), render };
  const user = value(binding.uid);

  bindings.add(binding);

  if (user) {
    render(user);
  }

  return () => bindings.delete(binding);
};

export const read = async (uid = "me", options = {}) => {
  const id = key(uid);

  if (!options.fresh && records.has(id)) {
    return { ok: true, status: 200, data: records.get(id) };
  }

  if (!options.fresh && pending.has(id)) {
    return pending.get(id);
  }

  const request = api(
    `${path}/${encodeURIComponent(id)}`
  ).then((result) =>
    result.ok
      ? { ...result, data: remember(id, result.data) }
      : result
  );

  pending.set(id, request);

  try {
    return await request;
  } finally {
    if (pending.get(id) === request) {
      pending.delete(id);
    }
  }
};

export const presence = (uid, state) => {
  const id = key(uid);
  const user = records.get(id);

  if (!user) {
    return;
  }

  remember(id, { ...user, state });
};

export const receiveLink = (token) => {
  linked = typeof token === "string" ? token : "";

  linkBindings.forEach((listener) => {
    listener(linked);
  });
};

export const onLink = (listener) => {
  linkBindings.add(listener);

  return () => linkBindings.delete(listener);
};

export const clearLink = () => {
  linked = "";
};

export const linkImage = (token) =>
  `/api${path}/image/link/` + encodeURIComponent(token);

export const checkName = (name) =>
  api(`${path}/name?name=${encodeURIComponent(name)}`);

export const save = (data) =>
  api(path, { method: "PATCH", data });

export const uploadAvatar = (file) =>
  upload(`${path}/image`, file);

export const imageLink = () =>
  api(`${path}/image/link`, { method: "POST" });

export const uploadLink = (token, file) =>
  upload(
    `${path}/image/link/${encodeURIComponent(token)}`,
    file
  );

export const useLink = (token) =>
  api(
    `${path}/image/link/` +
      `${encodeURIComponent(token)}/use`,
    { method: "POST" }
  );

export const applyLink = async () => {
  if (!linked) {
    return { ok: true };
  }

  const token = linked;
  const result = await useLink(token);

  if (result.ok) {
    linked = "";
  }

  return result;
};

export const block = (uid, reason) =>
  api(`${path}/${encodeURIComponent(uid)}/block`, {
    method: "POST",
    data: { reason }
  });

export const complete = async () => {
  const result = await api(`${path}/complete`, {
    method: "POST"
  });

  if (result.ok) {
    await read("me", { fresh: true });
  }

  return result;
};
