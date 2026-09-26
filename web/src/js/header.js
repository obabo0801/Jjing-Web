import * as dom from "#common/dom";
import * as css from "#common/css";
import device from "#common/device";
import * as profile from "#common/profile";
import view from "#common/profile/view";
import avatar from "#common/avatar";
import * as login from "#common/login";
import * as navigation from "#common/login/history";
import * as menu from "#common/menu";
import toast from "#common/toast";
import * as i18n from "#common/i18n";
import api from "#common/api";
import events, { isAdmin } from "#common/events";
import admin from "#common/admin";

import * as direct from "#common/chatting/direct";
import * as toolbar from "#common/toolbar";
import { chatting as path } from "#shared/route";

export default function header(app) {
  const root = dom.create("header");
  const home = dom.create("a");
  const icon = dom.create("img");
  const account = avatar("", "button");
  const items = [
    { name: "chatting", icon: "menu", text: "menu.chatMenu", run: () => menu.chatSettings() },
    { name: "admin", icon: "admin", text: "admin.panel", run: (button) => admin(button) },
    { name: "messenger", icon: "mail", text: "direct.inbox", run: () => direct.inbox() },
    { name: "setting", icon: "setting", text: "menu.title", run: (button) => menu.default(button) },
    { name: "account", element: account.root }
  ];
  const actions = toolbar.default(items, { compact: true });
  const buttons = new Map(items.map((item, index) => [item.name, actions.children[index]]));
  const messenger = buttons.get("messenger");
  const management = buttons.get("admin");

  actions.className = "header-actions";
  dom.remove(actions, "data-blur");
  dom.remove(actions, "data-shadow");

  root.className = "header";
  home.href = "/";
  home.draggable = false;
  icon.src = "/favicon.ico";
  icon.alt = "";
  icon.draggable = false;

  const title = dom.create("span");

  title.textContent = i18n.message("app.title");
  dom.set(title, "data-i18n", "app.title");
  home.append(icon, title);
  dom.set(account.root, "data-circle", "");
  dom.set(account.root, "data-scale", "");
  dom.set(account.root, "data-response", "");
  profile.bind(root, "me", (user) => {
    account.set(user.verified ? user.avatar : "");
    dom.set(account.root, "data-icon", user.verified ? "user" : "login");
    dom.set(account.root, "data-tooltip", user.verified ? "profile.own" : "login.title");
  });

  dom.on(account.root, "click", () =>
    profile.value()?.verified
      ? view(account.root, dom.query(".chatting"), { own: true, context: "chatting" })
      : login.default(account.root)
  );

  root.append(home, actions);
  app.prepend(root);

  const permissions = () => {
    if (management) management.hidden = !isAdmin();

    shadow();
  };

  for (const type of ["ready", "role"]) dom.on(events(), type, permissions);

  permissions();

  function shadow() {
    const { small, wearable } = device();
    const rect = root.getBoundingClientRect();
    const active = !small && !wearable && window.scrollY > 0;

    actions.toggleAttribute("data-sticky", !small && !wearable && rect.top < 0);
    css.set(app, {
      "--header-actions-width":
        small || wearable ? null : `${Math.ceil(actions.getBoundingClientRect().width)}px`
    });

    css.set(actions, {
      "--header-right":
        small || wearable ? null : `${document.documentElement.clientWidth - rect.right}px`
    });

    for (const button of actions.children) {
      button.toggleAttribute("data-background", !active);
      button.toggleAttribute("data-blur", active);
      button.toggleAttribute("data-shadow", active);
    }
  }

  dom.on(window, "scroll", shadow, { passive: true });
  dom.on(window, "pageshow", shadow);
  dom.on(window, "resize", shadow);
  shadow();

  let loading = false;
  let pending = false;
  let timer;

  const update = async () => {
    if (!messenger) return;

    clearTimeout(timer);
    if (loading) {
      pending = true;

      return;
    }

    loading = true;

    const result = await api(`${path}/direct/unread`);

    loading = false;
    if (pending) {
      pending = false;
      void update();

      return;
    }

    if (result.ok) toolbar.badge(messenger, result.data.count || null);
    else timer = setTimeout(update, 3000);
  };

  for (const type of [
    "direct",
    "direct-read",
    "direct-remove",
    "direct-change",
    "direct-state",
    "ready"
  ])
    dom.on(events(), type, update);
  dom.on(window, "pageshow", update);
  dom.on(document, "visibilitychange", () => {
    if (!document.hidden) void update();
  });

  void update();

  const url = new URL(location.href);
  const result = url.searchParams.get("login");
  const popup =
    url.searchParams.get("popup") === "1" &&
    ["success", "pending", "cancel", "error", "unavailable", "unsupported"].includes(result);

  const refresh = () => navigation.reset();

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("oanismajor-account");

    channel.onmessage = (event) => {
      if (event.data?.type === "login") {
        if (event.data.result === "success") refresh();
        else if (event.data.result === "pending") void login.pending();
        else if (["error", "unavailable", "unsupported"].includes(event.data.result))
          toast({ title: `login.${event.data.result}`, type: "error" });

        return;
      }

      if (typeof event.data === "string" && event.data !== profile.value()?.id) refresh();
    };

    channel.postMessage(popup ? { type: "login", result } : profile.value()?.id);

    dom.on(window, "pagehide", () => channel.close(), { once: true });
  }

  if (popup || ["pending", "error", "unavailable", "unsupported"].includes(result)) {
    url.searchParams.delete("login");
    if (popup) url.searchParams.delete("popup");

    history.replaceState(history.state, "", url);
    if (popup) window.close();

    if (["error", "unavailable", "unsupported"].includes(result))
      toast({ title: `login.${result}`, type: "error" });
  }
}
