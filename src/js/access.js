import { user } from "#config/route";

import api from "#common/api";
import device from "#common/device";

const show = async (name) => {
  const header =
    name === "offline" ? "X-PWA-Cache" : `X-${name}`;

  const response = await fetch(`/${name}`, {
    headers: { Accept: "text/html", [header]: "true" }
  });

  const html = await response.text();

  document.open();
  document.write(html);
  document.close();
};

export default async function access(
  redirect = true,
  name
) {
  const path =
    name && location.pathname === "/"
      ? `/${name.replace(/^\/+/, "")}`
      : decodeURI(`${location.pathname}${location.search}`);

  const result =
    performance.getEntriesByType("navigation")[0]
      ?.responseStatus ?? 0;

  const wearable = device().wearable;

  const options = {
    headers: { "X-Wearable": String(wearable) }
  };

  const response = await api(user, {
    ...options,
    method: "POST",
    data: { path, result }
  });

  if (response.status === 403) {
    if (redirect) {
      if (import.meta.env.DEV) {
        location.replace("/block");
      } else {
        location.reload();
      }
    }

    return false;
  }

  if (response.status === 503) {
    if (redirect) {
      await show("maintenance");
    }

    return false;
  }

  if (!response.ok) {
    if (redirect) {
      const page =
        response.status === 0 ? "offline" : "error";

      await show(page);
    }

    return false;
  }

  const query = new URLSearchParams({
    path,
    result,
    ...(name && { name })
  });

  const session = await api(`${user}?${query}`, options);

  if (session.status === 503) {
    if (redirect) {
      await show("maintenance");
    }

    return false;
  }

  if (!session.ok) {
    if (redirect) {
      const page =
        session.status === 0 ? "offline" : "error";

      await show(page);
    }

    return false;
  }

  if (!session.data?.valid) {
    if (redirect) {
      await show("denied");
    }

    return false;
  }

  return true;
}
