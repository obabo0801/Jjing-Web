const encode = encodeURIComponent;
const decode = decodeURIComponent;

export const get = (key) => {
  const name = `${encode(key)}=`;

  const item = document.cookie
    .split("; ")
    .find((value) =>
      value.startsWith(name)
    );

  return item
    ? decode(item.slice(name.length))
    : null;
};

export const set = (
  key, value, maxAge = 31_536_000
) => {
  const parts = [
    `${encode(key)}=${encode(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax"
  ];

  if (location.protocol === "https:") {
    parts.push("Secure");
  }

  document.cookie = parts.join("; ");

  return value;
};

export const remove = (key) => {
  set(key, "", 0);
};
