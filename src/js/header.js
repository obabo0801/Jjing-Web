import * as dom from "#common/dom";
import * as css from "#common/css";
import device from "#common/device";
import * as profile from "#common/profile";
import view from "#common/profile/view";
import avatar from "#common/avatar";
import * as login from "#common/login";
import * as navigation from "#common/login/history";
import menu from "#common/menu";
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
  const actions = dom.create("div");
  const messenger = dom.create("button");
  const setting = dom.create("button");

  actions.className = "header-actions";

  messenger.type = "button";
  dom.set(messenger, "data-background", "");
  dom.set(messenger, "data-icon", "mail");
  dom.set(messenger, "data-circle", "");
  dom.set(messenger, "data-scale", "");
  dom.set(messenger, "data-tooltip", "direct.inbox");
  dom.set(messenger, "data-response", "");
  dom.on(messenger, "click", () => direct.inbox());

  setting.type = "button";
  dom.set(setting, "data-background", "");
  dom.set(setting, "data-icon", "setting");
  dom.set(setting, "data-circle", "");
  dom.set(setting, "data-scale", "");
  dom.set(setting, "data-tooltip", "menu.title");
  dom.set(setting, "data-response", "");
  dom.on(setting, "click", async () => {
    setting.disabled = true;
    try {
      await menu(setting);
    } finally {
      setting.disabled = false;
    }
  });

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

  actions.append(messenger, setting, account.root);
  root.append(home, actions);
  app.prepend(root);

  let management;

  const permissions = () => {
    if (!isAdmin()) {
      management?.remove();
      management = undefined;
      shadow();

      return;
    }

    if (management) return;

    management = dom.create("button");
    management.type = "button";
    dom.set(management, "data-background", "");
    dom.set(management, "data-icon", "admin");
    dom.set(management, "data-circle", "");
    dom.set(management, "data-scale", "");
    dom.set(management, "data-tooltip", "admin.panel");
    dom.set(management, "data-response", "");
    dom.on(management, "click", () => admin(management));
    actions.prepend(management);
    shadow();
  };

  for (const type of ["ready", "role"]) dom.on(events(), type, permissions);

  permissions();

  function shadow() {
    const { small, wearable } = device();

    if (small || wearable) {
      dom.remove(actions, "data-sticky");

      dom.set(messenger, "data-background", "");
      dom.remove(messenger, "data-blur");
      dom.remove(messenger, "data-shadow");

      dom.remove(account.root, "data-blur");
      dom.remove(account.root, "data-shadow");

      dom.set(setting, "data-background", "");
      dom.remove(setting, "data-blur");
      dom.remove(setting, "data-shadow");

      if (management) {
        dom.set(management, "data-background", "");
        dom.remove(management, "data-blur");
        dom.remove(management, "data-shadow");
      }

      css.set(actions, { "--header-right": null });
      css.set(app, { "--header-actions-width": null });

      return;
    }

    const rect = root.getBoundingClientRect();

    css.set(app, {
      "--header-actions-width": `${Math.ceil(actions.getBoundingClientRect().width)}px`
    });

    css.set(actions, {
      "--header-right": `${document.documentElement.clientWidth - rect.right}px`
    });

    actions.toggleAttribute("data-sticky", rect.top < 0);

    const active = window.scrollY > 0;

    messenger.toggleAttribute("data-background", !active);
    messenger.toggleAttribute("data-blur", active);
    messenger.toggleAttribute("data-shadow", active);

    account.root.toggleAttribute("data-blur", active);
    account.root.toggleAttribute("data-shadow", active);

    setting.toggleAttribute("data-background", !active);
    setting.toggleAttribute("data-blur", active);
    setting.toggleAttribute("data-shadow", active);

    if (management) {
      management.toggleAttribute("data-background", !active);
      management.toggleAttribute("data-blur", active);
      management.toggleAttribute("data-shadow", active);
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
    ["success", "pending", "cancel", "error", "unavailable"].includes(result);

  const refresh = () => navigation.reset();

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("jjing-account");

    channel.onmessage = (event) => {
      if (event.data?.type === "login") {
        if (event.data.result === "success") refresh();
        else if (event.data.result === "pending") void login.pending();
        else if (["error", "unavailable"].includes(event.data.result))
          toast({ title: `login.${event.data.result}`, type: "error" });

        return;
      }

      if (typeof event.data === "string" && event.data !== profile.value()?.id) refresh();
    };

    channel.postMessage(popup ? { type: "login", result } : profile.value()?.id);
    dom.on(window, "pagehide", () => channel.close(), { once: true });
  }

  if (popup || ["pending", "error", "unavailable"].includes(result)) {
    url.searchParams.delete("login");
    if (popup) url.searchParams.delete("popup");

    history.replaceState(history.state, "", url);
    if (popup) window.close();

    if (["error", "unavailable"].includes(result))
      toast({ title: `login.${result}`, type: "error" });
  }
}
