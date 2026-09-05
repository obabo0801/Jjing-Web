export default async function upload(
  path,
  value,
  options = {}
) {
  const file = value instanceof Blob ? value : value?.file;
  const edit = value instanceof Blob ? null : value?.edit;

  if (!(file instanceof Blob) || !file.size) {
    return { ok: false, status: 0, data: null };
  }

  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      method: options.method || "POST",
      headers: {
        "Content-Type":
          file.type || "application/octet-stream",
        ...(edit
          ? { "X-Image-Edit": JSON.stringify(edit) }
          : {}),
        ...options.headers
      },
      body: file
    });

    const json = response.headers
      .get("content-type")
      ?.includes("application/json");
    const data = json ? await response.json() : null;

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
