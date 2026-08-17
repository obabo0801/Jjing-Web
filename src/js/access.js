import { user } from "#config/route";

import api from "#common/api";

export default async function access(
  redirect = true, name
) {
  const current = decodeURI(
    `${location.pathname}${location.search}`
  );

  const path = name && location.pathname === "/"
    ? `/${name.replace(/^\/+/, "")}`
    : current;

  const result = performance
    .getEntriesByType("navigation")[0]
    ?.responseStatus ?? 0;

  const response = await api(user, {
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

  if (!response.ok) {
    if (redirect) {
      location.replace("/offline");
    }

    return false;
  }

  const query = new URLSearchParams({
    path, result, ...(name && { name })
  });

  const session = await api(
    `${user}?${query}`
  );

  if (!session.ok) {
    if (redirect) {
      location.replace("/offline");
    }

    return false;
  }

  if (!session.data?.valid) {
    if (redirect) {
      const denied = await fetch("/denied", {
        headers: { "X-Denied": "true" }
      });

      const html = await denied.text();

      document.open();
      document.write(html);
      document.close();
    }

    return false;
  }

  return true;
}
