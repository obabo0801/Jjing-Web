import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import api from "#common/api";
import drawer from "#common/drawer";
import mount from "#common/mount";
import events from "#common/events";
import label from "#common/profile/label";
import { profile as path } from "#shared/route";
import * as tools from "#common/profile/history/tools";
import { actions } from "#shared/history";
import progress from "#common/progress";
import * as route from "#common/route";

for (const type of ["chatting", "sanction"]) {
  route.register(
    `history-${type}`,
    (id) => (/^[a-f\d]{32}$/.test(id) ? history(id, type) : false),
    "drawer"
  );
}

i18n.preload(
  "profile.chatHistory",
  "profile.blockHistory",
  "profile.historyEmpty",
  "profile.historyError",
  "profile.historyTime",
  "profile.historyText",
  "profile.historyAction",
  "profile.historyReason",
  "profile.historyBlock",
  "profile.historyUnblock",
  "profile.historyMute",
  "profile.historyKick",
  "profile.historyUnkick",
  "profile.until",
  "profile.around",
  "profile.handler",
  "profile.none",
  "chatting.retry",
  "chatting.tools.image",
  "chatting.audio.message"
);

const caption = (element, key) => {
  element.textContent = i18n.message(key);
  dom.set(element, "data-i18n", key);
};

const record = (entry, type) => {
  const group = dom.create("div");

  group.className = "group";

  if (entry.deleted) {
    dom.set(group, "data-deleted", "");
  }

  if (type === "chatting") {
    const row = dom.create("div");
    const button = dom.create("button");
    const title = dom.create("span");
    const arrow = dom.create("span");

    row.className = "group-item";
    button.type = "button";
    dom.set(button, "data-response", "");
    caption(title, "profile.around");
    arrow.className = "profile-next";
    dom.set(arrow, "data-icon", "arrow");
    button.append(title, arrow);
    dom.on(button, "click", () => {
      location.assign(`/?message=${encodeURIComponent(entry.url)}`);
    });
    row.append(button);
    group.append(
      label("profile.historyTime", entry.time, { date: true }),
      label(
        "profile.historyText",
        entry.text ||
          (entry.image && i18n.message("chatting.tools.image")) ||
          (entry.audio && i18n.message("chatting.audio.message"))
      ),
      row
    );
  } else {
    group.append(
      label(
        "profile.historyAction",
        i18n.message(
          {
            block: "profile.historyBlock",
            unblock: "profile.historyUnblock",
            mute: "profile.historyMute",
            kick: "profile.historyKick",
            unkick: "profile.historyUnkick"
          }[entry.action]
        )
      ),
      label("profile.historyTime", entry.time, { date: true }),
      label(
        "profile.historyReason",
        entry.reason || i18n.message("profile.none")
      ),
      label("profile.handler", entry.handler || i18n.message("profile.none")),
      ...[label("profile.until", entry.until, { date: true })].filter(Boolean)
    );
  }
  return group;
};

export default async function history(id, type) {
  const root = dom.create("div");
  const list = dom.create("div");
  const status = dom.create("div");
  const more = dom.create("button");
  const edge = dom.create("div");
  const loading = progress({ type: "circular", value: 25, show: false });

  root.className = "profile profile-records";
  list.className = "profile-section";
  more.type = "button";
  dom.set(more, "data-response", "");
  caption(more, "chatting.retry");
  more.hidden = true;
  edge.className = "history-edge";
  root.append(list, status, more, edge);

  let cursor;
  let busy = false;
  let active = true;
  let request;
  let observer;

  const source = events();
  const filters = tools.create(
    () => refresh(),
    type === "sanction" ? actions : {}
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

    if (cursor) query.set("cursor", cursor);
    for (const [key, value] of Object.entries(filters.values))
      if (value) query.set(key, value);
    const result = await api(
      `${path}/${encodeURIComponent(id)}/history/${type}?${query}`,
      { cache: "no-store", signal: controller.signal }
    );

    if (!active || request !== controller) return;
    status.replaceChildren();
    busy = false;
    const page = result.data;

    if (
      !result.ok ||
      !Array.isArray(page?.items) ||
      !(page.next === null || typeof page.next === "string") ||
      (page.next !== null && page.next === cursor)
    ) {
      if ([403, 404].includes(result.status)) {
        list.replaceChildren();
        cursor = undefined;
        filters.count();
      }
      status.className = "history-status profile-error";
      caption(status, "profile.historyError");
      more.hidden = false;
      return;
    }
    tools.append(list, page.items, (entry) => record(entry, type));
    if (cursor === undefined) filters.count(page.total);
    cursor = page.next;
    status.hidden = Boolean(list.childElementCount);
    caption(status, "profile.historyEmpty");
    mount(root);
    if (cursor !== null) observer?.observe(edge);
  };

  function refresh() {
    if (!active) return;
    request?.abort();
    request = null;
    busy = false;
    cursor = undefined;
    filters.count();
    list.replaceChildren();
    load();
  }

  const update = (event) => {
    try {
      if (JSON.parse(event.data).id === id) refresh();
    } catch {
      // 잘못된 이벤트는 현재 조회 상태를 변경하지 않습니다.
    }
  };

  dom.on(more, "click", load);
  source?.addEventListener("role", refresh);
  source?.addEventListener("ready", refresh);
  source?.addEventListener("profile-update", update);

  if (type === "chatting") {
    source?.addEventListener("chatting-remove", refresh);
  }

  try {
    await drawer({
      route: [`history-${type}`, id],
      title:
        type === "chatting" ? "profile.chatHistory" : "profile.blockHistory",
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
    source?.removeEventListener("role", refresh);
    source?.removeEventListener("ready", refresh);
    source?.removeEventListener("profile-update", update);

    if (type === "chatting") {
      source?.removeEventListener("chatting-remove", refresh);
    }

    list.replaceChildren();
  }
}
