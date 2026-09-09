import hash from "#config/hash";

export const routes = ["users", "images"].flatMap((folder) =>
  ["original", "resizing"].map((kind) => {
    const directory = `${folder}/${kind}`;
    const legacy = `/upload/${directory}`;

    return { directory, legacy, prefix: `/${hash(8, legacy.slice(1))}` };
  })
);

export const url = (folder, kind, file) => {
  const route = routes.find((item) => item.directory === `${folder}/${kind}`);

  if (!route) {
    throw new RangeError("Unknown upload directory");
  }

  return `${route.prefix}/${file}`;
};

export const resolve = (value = "") => {
  if (typeof value !== "string") {
    return "";
  }

  const route = routes.find((item) => value.startsWith(`${item.legacy}/`));

  return route ? `${route.prefix}${value.slice(route.legacy.length)}` : value;
};
