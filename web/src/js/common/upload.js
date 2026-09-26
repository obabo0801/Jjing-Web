export default async function upload(path, value, options = {}) {
  const file = value instanceof Blob ? value : value?.file;
  const edit = value instanceof Blob ? null : value?.edit;

  if (!(file instanceof Blob) || !file.size) {
    return { ok: false, status: 0, data: null };
  }

  if (options.progress) {
    return new Promise((resolve) => {
      const request = new XMLHttpRequest();
      const signal = options.signal;
      const cancel = () => request.abort();

      let settled = false;

      const finish = (result) => {
        if (settled) return;

        settled = true;
        signal?.removeEventListener("abort", cancel);
        resolve(result);
      };
      const failed = () => finish({ ok: false, status: 0, data: null });

      if (signal?.aborted) return failed();

      request.open(options.method || "POST", `/api${path}`);
      request.responseType = "json";
      request.withCredentials = options.credentials === "include";
      for (const [name, value] of Object.entries({
        "Content-Type": file.type || "application/octet-stream",
        ...(edit ? { "X-Image-Edit": JSON.stringify(edit) } : {}),
        ...options.headers
      }))
        request.setRequestHeader(name, value);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) options.progress(event.loaded, event.total);
      };

      request.onload = () =>
        finish({
          ok: request.status >= 200 && request.status < 300,
          status: request.status,
          data: request.response
        });

      request.onerror = failed;
      request.onabort = failed;
      request.ontimeout = failed;
      signal?.addEventListener("abort", cancel, { once: true });
      try {
        request.send(file);
      } catch {
        failed();
      }
    });
  }

  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      method: options.method || "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        ...(edit ? { "X-Image-Edit": JSON.stringify(edit) } : {}),
        ...options.headers
      },
      body: file
    });

    const json = response.headers.get("content-type")?.includes("application/json");
    const data = json ? await response.json() : null;

    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
