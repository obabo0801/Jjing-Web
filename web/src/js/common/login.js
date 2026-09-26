import * as dom from "#common/dom";
import api from "#common/api";
import * as events from "#common/events";
import * as i18n from "#common/i18n";
import popover from "#common/popover";
import legal from "#common/legal";
import toast from "#common/toast";
import dialog from "#common/dialog";
import * as route from "#common/route";
import * as profile from "#common/profile";
import * as navigation from "#common/login/history";
import { user } from "#shared/route";

route.register("login", () => login());

let popup;

const google = () => {
  const query = new URLSearchParams({ origin: location.origin });
  const url = `/api${user}/google?${query}`;
  const standalone =
    navigator.standalone ||
    matchMedia("(display-mode: standalone)").matches ||
    matchMedia("(display-mode: minimal-ui)").matches;

  if (
    standalone ||
    matchMedia("(pointer: coarse)").matches ||
    typeof BroadcastChannel === "undefined"
  ) {
    navigation.reset(url);

    return;
  }

  if (popup && !popup.closed) {
    popup.focus();

    return;
  }

  popup = window.open(`${url}&popup=1`, "oanismajor-login", "popup,width=500,height=700");

  if (!popup) navigation.reset(url);
};

i18n.preload(
  "profile.delete",
  "profile.deleteInfo",
  "profile.deleteError",
  "profile.deletion",
  "profile.deletionInfo",
  "profile.restore",
  "profile.restoreError",
  "login.title",
  "login.google",
  "login.logout",
  "login.error",
  "login.unavailable",
  "login.unsupported",
  "terms.title",
  "privacy.title"
);

export const pending = async () => {
  const result = await api(`${user}/account`);
  const date = result.data?.deletion;

  if (!Number.isSafeInteger(date)) return;
  const content = dom.create("div");
  const text = dom.create("p");
  const time = dom.create("time");

  text.textContent = i18n.message("profile.deletionInfo");
  dom.set(text, "data-i18n", "profile.deletionInfo");
  time.dateTime = new Date(date).toISOString();
  time.textContent = new Intl.DateTimeFormat(document.documentElement.lang, {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "short"
  }).format(date);

  content.append(text, time);
  await dialog({
    title: "profile.deletion",
    content,
    direction: "→",
    actions: [
      { text: "profile.cancel", icon: "close", value: false, data: ["data-neutral"] },
      {
        text: "profile.restore",
        icon: "check",
        run: async () => {
          const result = await api(`${user}/account`, { method: "POST", data: {} });

          if (result.ok) navigation.reset();
          else toast({ title: "profile.restoreError", type: "error" });

          return result.ok;
        }
      }
    ]
  });
};

export const links = () => {
  const root = dom.create("footer");

  root.className = "login-links";
  for (const name of ["terms", "privacy"]) {
    const link = dom.create("a");

    link.href = `/${name}`;
    link.textContent = i18n.message(`${name}.title`);
    dom.set(link, "data-i18n", `${name}.title`);

    dom.on(link, "click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      legal(name);
    });

    root.append(link);
  }

  return root;
};

export const remove = async () => {
  await dialog({
    title: "profile.delete",
    content: "profile.deleteInfo",
    direction: "→",
    actions: [
      { text: "profile.cancel", icon: "close", value: false, data: ["data-neutral"] },
      {
        text: "data.delete.confirm",
        icon: "trash",
        data: ["data-danger"],
        run: async () => {
          const result = await api(`${user}/account`, { method: "DELETE", data: {} });

          if (result.ok) navigation.reset();
          else toast({ title: "profile.deleteError", type: "error" });

          return result.ok;
        }
      }
    ]
  });
};

export const logout = async () => {
  const session = events.suspend();
  const result = await api(`${user}/logout`, { method: "POST", data: { session } });

  if (result.ok) {
    navigation.reset();

    return;
  }

  events.resume();
  toast({ title: "login.error", type: "error" });
};

export default async function login(anchor) {
  const result = await profile.read("me", { fresh: true });

  if (!result.ok || result.data?.verified) return false;
  const root = dom.create("div");
  const button = dom.create("button");
  const text = dom.create("span");

  root.className = "login";
  button.className = "login-google";
  button.type = "button";
  dom.set(button, "data-shadow", "");
  dom.set(button, "data-icon", "google");
  dom.set(button, "data-color", "");
  dom.set(button, "data-circle", "");
  dom.set(button, "data-scale", "");
  dom.set(button, "data-tooltip", "login.google");
  dom.set(button, "data-response", "");
  dom.on(button, "click", google);

  text.textContent = i18n.message("login.google");
  dom.set(text, "data-i18n", "login.google");
  button.append(text);
  root.append(button, links());

  return popover({
    size: "24rem",
    route: ["login", ""],
    title: "login.title",
    anchor,
    content: root,
    blur: true,
    direction: "→"
  });
}
