export default async function api(
  path, { data, ...options } = {}
) {
  try {
    const response = await fetch(`/api${path}`, {
      ...options,

      ...(data !== undefined && {
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        },
        body: JSON.stringify(data)
      })
    });

    const json = response.headers
      .get("content-type")
      ?.includes("application/json");

    const body = json
      ? await response.json()
      : null;

    return {
      ok: response.ok,
      status: response.status,
      data: body
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null
    };
  }
}
