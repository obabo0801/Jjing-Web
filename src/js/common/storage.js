export const get = (key, fallback = null) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const set = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
  }

  return value;
};

export const remove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
  }
};

export const clear = () => {
  try {
    localStorage.clear();
  } catch {
  }
};
