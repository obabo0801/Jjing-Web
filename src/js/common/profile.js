import { profile as path } from "#shared/route";

import api from "#common/api";
import upload from "#common/upload";

const records = new Map();
const pending = new Map();
const latest = new Map();
const bindings = new Set();
const linkBindings = new Set();

let linked = "";
let generation = 0;
let sequence = 0;

const key = (id) => id || "me";

const notify = (id, user) => {
  for (const binding of bindings) {
    if (!binding.element.isConnected) {
      bindings.delete(binding);
    } else if (binding.id === id) {
      binding.render(user);
    }
  }
};

const remember = (id, user) => {
  if (!user?.id) {
    return user;
  }

  const value = { ...user };

  records.set(user.id, value);
  notify(user.id, value);

  if (id === "me" || value.self) {
    records.set("me", value);
    notify("me", value);
  }

  return value;
};

export const value = (id = "me") => records.get(key(id));

const discard = (target) => {
  const user = records.get(target);

  records.delete(target);
  if (!user) return;
  const { id, name, image, avatar, self, state, time } = user;
  const own = records.get("me")?.id === id || target === "me";
  const safe = { id, name, image, avatar, self, state, time, manage: false };

  records.delete(id);
  if (own) records.delete("me");
  notify(id, safe);
  if (own) notify("me", safe);
};

export const bind = (element, id, render) => {
  const binding = { element, id: key(id), render };
  const user = value(binding.id);

  bindings.add(binding);

  if (user) {
    render(user);
  }

  return () => bindings.delete(binding);
};

export const read = async (id = "me", options = {}) => {
  const target = key(id);

  if (!options.fresh && records.has(target)) {
    return { ok: true, status: 200, data: records.get(target) };
  }

  if (!options.fresh && pending.has(target)) {
    return pending.get(target);
  }

  const version = generation;
  const canonical = records.get(target)?.id || target;
  const entry = { order: ++sequence };

  latest.set(target, entry);
  latest.set(canonical, entry);
  const request = api(`${path}/${encodeURIComponent(target)}`).then(
    (result) => {
      const current = [target, canonical, result.data?.id]
        .map((id) => latest.get(id))
        .filter(Boolean)
        .sort((a, b) => b.order - a.order)[0];

      if (version !== generation || current !== entry) {
        // 지난 응답은 버리되 호출자는 최신 조회의 성공 · 실패를 받습니다.
        return current?.request || read(target);
      }
      if (!result.ok) {
        if ([403, 404].includes(result.status)) discard(target);
        return result;
      }
      latest.set(result.data?.id || canonical, entry);
      return { ...result, data: remember(target, result.data) };
    }
  );

  entry.request = request;
  pending.set(target, request);

  try {
    return await request;
  } finally {
    if (pending.get(target) === request) {
      pending.delete(target);
    }
  }
};

export const presence = (id, state) => {
  const target = key(id);
  const user = records.get(target);

  if (!user) {
    return;
  }

  remember(target, { ...user, state });
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

export const save = (data) => api(path, { method: "PATCH", data });

export const uploadAvatar = (file) => upload(`${path}/image`, file);

export const imageLink = () => api(`${path}/image/link`, { method: "POST" });

export const uploadLink = (token, file) =>
  upload(`${path}/image/link/${encodeURIComponent(token)}`, file);

export const useLink = (token) =>
  api(`${path}/image/link/` + `${encodeURIComponent(token)}/use`, {
    method: "POST"
  });

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

export const block = (id, reason) =>
  api(`${path}/${encodeURIComponent(id)}/block`, {
    method: "POST",
    data: { reason }
  });

export const unblock = (id, reason) =>
  api(`${path}/${encodeURIComponent(id)}/block`, {
    method: "DELETE",
    data: { reason }
  });

export const authority = (id, data) =>
  api(`${path}/${encodeURIComponent(id)}/authority`, { method: "PATCH", data });

export const refresh = async (id) => {
  const result = await read(id, { fresh: true });

  if (!result.ok) discard(key(id));
  return result;
};

export const reset = () => {
  const ids = new Set([
    ...pending.keys(),
    ...[...bindings]
      .filter(({ element }) => element.isConnected)
      .map(({ id }) => id)
  ]);

  generation++;
  pending.clear();
  latest.clear();
  // 권한 변경 후 재조회가 늦거나 실패해도 이전 관리 정보를 즉시 지웁니다.
  for (const target of [...records.keys()]) discard(target);
  return Promise.all([...ids].map((id) => read(id, { fresh: true })));
};

export const complete = async (consent, image = "keep") => {
  const result = await api(`${path}/complete`, {
    method: "POST",
    data: { consent, image }
  });

  if (result.ok) {
    await read("me", { fresh: true });
  }

  return result;
};

export const sanction = (id, action, reason) =>
  api(`${path}/${encodeURIComponent(id)}/sanction`, {
    method: "POST",
    data: { action, reason }
  });
