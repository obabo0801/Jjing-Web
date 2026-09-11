import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import api from "#common/api";
import drawer from "#common/drawer";
import mount from "#common/mount";
import events from "#common/events";
import once from "#common/once";
import label from "#common/profile/label";
import * as route from "#shared/route";
import { reasons } from "#shared/report";
import * as tools from "#common/profile/history/tools";
import progress from "#common/progress";
import media from "#common/chatting/media";

const opening = once();

i18n.preload(
  "report.inbox",
  "profile.reportHistory",
  "report.all",
  "report.user",
  "report.message",
  "report.type",
  "report.text",
  "report.target",
  "report.reporter",
  "report.time",
  "report.reason",
  "report.description",
  "report.conversation",
  "profile.none",
  "profile.historyEmpty",
  "profile.historyError",
  "chatting.retry",
  ...reasons.map((reason) => `report.${reason}`)
);

const caption = (node, key) => {
  node.textContent = i18n.message(key);
  dom.set(node, "data-i18n", key);
};

const record = (entry) => {
  const root = dom.create("div");

  root.className = "group";

  if (entry.deleted) {
    dom.set(root, "data-deleted", "");
  }

  root.append(
    ...[
      label("report.type", i18n.message(`report.${entry.type}`)),
      label("report.time", entry.time, { date: true }),
      label("report.target", entry.name || entry.target),
      label("report.reporter", entry.reporter || i18n.message("profile.none")),
      label("report.reason", i18n.message(`report.${entry.reason}`)),
      label("report.description", entry.detail || i18n.message("profile.none"))
    ].filter(Boolean)
  );
  if (entry.type === "message" && entry.message) {
    const row = dom.create("div");
    const button = dom.create("button");
    const title = dom.create("span");
    const arrow = dom.create("span");

    row.className = "group-item";
    button.type = "button";
    dom.set(button, "data-response", "");
    caption(title, "report.conversation");
    arrow.className = "profile-next";
    dom.set(arrow, "data-icon", "arrow");
    button.append(title, arrow);
    dom.on(button, "click", () => {
      location.assign(`/?message=${encodeURIComponent(entry.message)}`);
    });
    row.append(button);
    root.append(...[label("report.text", entry.text), row].filter(Boolean));
    const images = dom.create("div");

    images.className = "chatting-text";
    media(images, entry);
    if (images.childElementCount) root.append(images);
  }
  return root;
};

export default function inbox(id) {
  return opening(id || "inbox", async () => {
    const root = dom.create("div");
    const list = dom.create("div");
    const status = dom.create("div");
    const more = dom.create("button");
    const edge = dom.create("div");
    const loading = progress({ type: "circular", value: 25, show: false });

    root.className = "profile report";
    list.className = "profile-section";
    more.type = "button";
    dom.set(more, "data-response", "");
    caption(more, "chatting.retry");
    more.hidden = true;
    edge.className = "history-edge";
    root.append(list, status, more, edge);

    let cursor;
    let request;
    let active = true;
    let busy = false;
    let observer;

    const source = events();
    const filters = tools.create(
      () => refresh(),
      { user: "report.user", message: "report.message" },
      "type"
    );

    const load = async () => {
      if (!active || busy || cursor === null) return;
      busy = true;
      observer?.unobserve(edge);
      more.hidden = true;
      status.hidden = false;
      status.className = "history-status";
      dom.remove(status, "data-i18n");
      status.replaceChildren(loading.element);
      const controller = new AbortController();

      request = controller;
      const query = new URLSearchParams({ limit: "50" });

      if (cursor) query.set("before", cursor);
      for (const [key, value] of Object.entries(filters.values))
        if (value) query.set(key, value);
      const url = id
        ? `${route.profile}/${encodeURIComponent(id)}/history/report`
        : route.report;

      const result = await api(`${url}?${query}`, {
        cache: "no-store",
        signal: controller.signal
      });

      if (!active || request !== controller) return;
      status.replaceChildren();
      busy = false;
      if (
        !result.ok ||
        !Array.isArray(result.data?.items) ||
        !(result.data.next === null || typeof result.data.next === "string") ||
        (result.data.next !== null && result.data.next === cursor)
      ) {
        if (result.status === 403) {
          list.replaceChildren();
          cursor = undefined;
          filters.count();
        }
        caption(status, "profile.historyError");
        status.className = "history-status profile-error";
        more.hidden = false;
        return;
      }
      tools.append(list, result.data.items, record);
      if (cursor === undefined) filters.count(result.data.total);
      cursor = result.data.next;
      status.hidden = Boolean(list.childElementCount);
      caption(status, "profile.historyEmpty");
      mount(root);
      if (cursor !== null) observer?.observe(edge);
    };

    function refresh() {
      if (!active) return;
      request?.abort();
      request = null;
      cursor = undefined;
      filters.count();
      busy = false;
      list.replaceChildren();
      load();
    }

    dom.on(more, "click", load);

    for (const event of [
      "role",
      "ready",
      "profile-update",
      "chatting-remove"
    ]) {
      source?.addEventListener(event, refresh);
    }

    try {
      await drawer({
        title: id ? "profile.reportHistory" : "report.inbox",
        content: root,
        back: true,
        side: "right",
        direction: "→",
        ready: (element) => {
          observer = new IntersectionObserver(
            (entries) => {
              if (more.hidden && entries.some((entry) => entry.isIntersecting))
                load();
            },
            { root: element, rootMargin: "0px 0px 128px 0px" }
          );
          load();
        },
        toolbar: filters.root
      });
    } finally {
      active = false;
      observer?.disconnect();
      request?.abort();
      loading.destroy();
      list.replaceChildren();
      for (const event of [
        "role",
        "ready",
        "profile-update",
        "chatting-remove"
      ]) {
        source?.removeEventListener(event, refresh);
      }
    }
  });
}
