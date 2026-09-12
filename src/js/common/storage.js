const aliases = { recent: "input-recent", tab: "events-tab" };

const name = (key) => {
  if (!import.meta.env.PROD) return key;
  let hash = 14695981039346656037n;

  for (const letter of key)
    hash = BigInt.asUintN(
      64,
      (hash ^ BigInt(letter.codePointAt(0))) * 1099511628211n
    );
  return hash.toString(16).padStart(16, "0");
};

export const get = (key, fallback = null, area = "local") => {
  let value = fallback;

  try {
    const storage = globalThis[`${area}Storage`];
    const target = name(key);
    const current = storage.getItem(target);

    value = current ?? storage.getItem(key);
    if (value === null && aliases[key]) value = storage.getItem(aliases[key]);
    if (value === null) return fallback;
    if (current === null) storage.setItem(target, value);
    if (target !== key) storage.removeItem(key);
    if (aliases[key]) storage.removeItem(aliases[key]);
  } catch {}
  return value;
};

export const set = (key, value, area = "local") => {
  try {
    const storage = globalThis[`${area}Storage`];
    const target = name(key);

    storage.setItem(target, String(value));
    if (target !== key) storage.removeItem(key);
    if (aliases[key]) storage.removeItem(aliases[key]);
  } catch {}
};

export const remove = (key, area = "local") => {
  try {
    const storage = globalThis[`${area}Storage`];

    storage.removeItem(name(key));
    storage.removeItem(key);
    if (aliases[key]) storage.removeItem(aliases[key]);
  } catch {}
};

export const clear = () => {
  try {
    localStorage.clear();
    return true;
  } catch {
    return false;
  }
};
