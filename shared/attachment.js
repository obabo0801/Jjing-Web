export const maximum = 10;
export const description = 500;
export const types = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const domain = "https://ogq-sticker-global-cdn-z01.sooplive.com";

export const ogq = (value) => {
  if (
    !/^[a-f0-9]{8,32}$/i.test(value?.ogq_id || "") ||
    !Number.isInteger(value.number) ||
    value.number < 1 ||
    value.number > 1000 ||
    ![80, 160, 240].includes(value.size)
  )
    return null;
  return {
    type: "ogq",
    ogq_id: value.ogq_id,
    number: value.number,
    size: value.size,
    extension: ["png", "webp"].includes(value.extension)
      ? value.extension
      : "png",
    version: /^[\w.-]{1,32}$/.test(value.version || "") ? value.version : "1"
  };
};

export const source = (item) => {
  const value = ogq(item);

  return value
    ? `${domain}/sticker/${value.ogq_id}/${value.number}_${value.size}.${value.extension}`
    : "";
};

export const valid = (items) =>
  Array.isArray(items) &&
  items.length <= maximum &&
  items.every((item) => {
    if (item?.type === "ogq") return Boolean(ogq(item));
    return (
      ["image", "gif"].includes(item?.type) &&
      [item.image, item.preview].every(
        (value) => typeof value === "string" && /^\/(?!\/)/.test(value)
      ) &&
      typeof item.description === "string" &&
      item.description.length <= description &&
      typeof item.spoiler === "boolean"
    );
  });
