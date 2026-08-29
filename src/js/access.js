import { user } from "#config/route";

import api from "#common/api";
import device from "#common/device";

const showPage = async (name) => {
  const header = name === "offline" ? "X-PWA-Cache" : `X-${name}`;

  const response = await fetch(`/${name}`, {
    headers: { Accept: "text/html", [header]: "true" }
  });

  const html = await response.text();
  document.open();
  document.write(html);
  document.close();
};

const errorPage = (response) => {
  if (response.status === 503) {
    return "maint";
  }

  if (response.ok) {
    return "";
  }

  return response.status === 0 ? "offline" : "error";
};

export default async function access(navigate = true, name) {
  const path =
    name && location.pathname === "/"
      ? `/${name.replace(/^\/+/, "")}`
      : decodeURI(`${location.pathname}${location.search}`);

  const navigation = performance.getEntriesByType("navigation")[0];

  const status = navigation?.responseStatus ?? 0;

  const key = `access:${path}`;
  const now = Date.now();

  let recent = false;

  try {
    const last = Number(sessionStorage.getItem(key));
    recent = now - last < 60_000;
  } catch {}

  const wearable = device().wearable;

  const headers = { "X-Wearable": String(wearable) };

  const response = await api(user, {
    headers,
    method: "POST",
    data: { path, result: status }
  });

  if (response.status === 403) {
    if (navigate) {
      if (import.meta.env.DEV) {
        location.replace("/block");
      } else {
        await showPage("block");
      }
    }

    return false;
  }

  const firstError = errorPage(response);

  if (firstError) {
    if (navigate) {
      await showPage(firstError);
    }

    return false;
  }

  const query = new URLSearchParams({
    path,
    result: status,
    ...(name && { name }),
    ...(recent && { recent: "true" })
  });

  const session = await api(`${user}?${query}`, { headers });

  const sessionError = errorPage(session);

  if (sessionError) {
    if (navigate) {
      await showPage(sessionError);
    }

    return false;
  }

  try {
    sessionStorage.setItem(key, String(now));
  } catch {}

  if (!session.data?.valid) {
    if (navigate) {
      await showPage("denied");
    }

    return false;
  }

  return true;
}
