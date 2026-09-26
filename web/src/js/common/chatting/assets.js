import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as clock from "#common/chatting/time";
import { chatting as path } from "#shared/route";
import api from "#common/api";
import drawer from "#common/drawer";
import view from "#common/image/view";
import * as actions from "#common/chatting/asset";
import picture from "#common/image/load";
import * as quality from "#common/image/quality";
import * as link from "#common/link";
import embed from "#common/embed";
import mount from "#common/mount";
import retry from "#common/retry";
import format from "#common/format";
import once from "#common/once";
import "../../../css/common/chatting/assets.css";

const opening = once();
const kinds = ["image", "file", "link"];

i18n.preload(
  "assets.title",
  "assets.summary",
  "assets.count",
  "assets.unknown",
  "assets.empty",
  "assets.error",
  ...kinds.map((kind) => `assets.${kind}`)
);

const node = (tag, name = "", text = "") => {
  const result = dom.create(tag);

  result.className = name;
  result.textContent = text;

  return result;
};

export default function assets(selected = "image", room = "") {
  const base = room ? `${path}/rooms/${room}/assets` : `${path}/assets`;

  return opening(`assets:${room}`, async () => {
    const root = node("div", "chatting-assets");
    const tabs = node("div", "segment");
    const totals = node("p", "assets-summary");
    const list = node("div", "assets-list");
    const edge = node("div", "history-edge");

    const dates = new Map();
    const seen = new Set();
    const pictures = [];

    let kind = kinds.includes(selected) ? selected : "image";
    let cursor;
    let busy = false;
    let closed = false;
    let request = new AbortController();
    let observer;
    let element;

    const retries = retry(load, () => !closed);
    const image = (title) => {
      const img = node("img");

      img.decoding = "async";
      img.alt = title || "";
      img.loading = "lazy";
      img.draggable = false;
      img.referrerPolicy = "no-referrer";

      return img;
    };

    const render = (item) => {
      if (seen.has(item.id)) return;

      seen.add(item.id);

      const day = clock.day(item.time);

      if (!dates.has(day)) {
        const section = node("section", "group-section");
        const group = node("div", "group");

        dom.set(group, "data-background", "");
        if (kind !== "file") dom.set(group, "data-view", "grid");

        section.append(node("h3", "group-title", clock.label(item.time)), group);

        list.append(section);
        dates.set(day, group);
      }

      const row = node("div", "group-item");
      const button = node(kind === "image" ? "button" : kind === "link" ? "div" : "a", "asset");

      if (kind === "image") {
        button.type = "button";

        const img = image(item.name);

        button.append(img);
        picture(img, { target: button, source: quality.thumb(item), lazy: true });

        pictures.push(item);
        dom.on(button, "click", () =>
          view(item.url, button, "", undefined, {
            items: () => pictures,
            more: load,
            end: () => cursor === null
          })
        );
      } else if (kind === "link") {
        const card = embed(item.url, {
          title: item.name || item.url,
          confirm: true,
          metadata: async () => {
            const signal = request.signal;
            const result = await api(`${base}/${item.id}`, { signal });

            return result.ok && !signal.aborted && !closed ? result.data : null;
          }
        });

        if (card) button.append(card);

        dom.set(button, "data-asset", item.id);
      } else {
        link.bind(button, { url: item.url, file: true, name: item.name, target: "_blank" });

        const icon = node("span", "asset-icon");
        const body = node("span", "asset-body");
        const title = node("span", "asset-title", item.name || item.url);

        dom.set(icon, "data-icon", kind === "link" ? "link" : "voice");
        body.append(title);
        button.append(icon, body);
        if (kind === "file") {
          body.append(
            node(
              "small",
              "asset-detail",
              item.size === null ? i18n.message("assets.unknown") : format(item.size)
            )
          );
        }
      }

      const selected = kind;

      actions.bind(button, {
        ...item,
        kind: selected,
        open:
          selected === "image"
            ? () =>
                view(item.url, button, "", undefined, {
                  items: () => pictures,
                  more: load,
                  end: () => cursor === null
                })
            : () =>
                link.open(item.url, { file: selected === "file", confirm: true, name: item.name })
      });

      row.append(button);
      dates.get(day).append(row);
    };

    async function load() {
      if (busy || closed) return false;

      if (cursor === null) return true;

      busy = true;
      observer?.unobserve(edge);
      edge.replaceChildren();

      const signal = request.signal;
      const query = new URLSearchParams({ kind });

      if (cursor) query.set("before", cursor);
      const result = await api(`${base}?${query}`, { signal });

      if (closed || signal.aborted) return false;

      busy = false;
      if (!result.ok) {
        if ([400, 401, 403, 404].includes(result.status))
          edge.replaceChildren(node("p", "", i18n.message("assets.error")));
        else retries.schedule();

        return false;
      }

      retries.reset();

      const data = result.data;

      const size = data.size === null ? i18n.message("assets.unknown") : format(data.size);

      totals.textContent = i18n
        .message(kind === "link" ? "assets.count" : "assets.summary")
        .replace("{count}", data.count)
        .replace("{size}", size);

      data.items.forEach(render);
      cursor = data.next;
      edge.replaceChildren();
      if (!seen.size) edge.append(node("p", "assets-empty", i18n.message("assets.empty")));

      mount(root);
      if (cursor !== null) observer?.observe(edge);

      return true;
    }

    for (const value of kinds) {
      const button = node("button", "", i18n.message(`assets.${value}`));

      button.type = "button";
      dom.set(button, "data-i18n", `assets.${value}`);
      button.toggleAttribute("data-selected", value === kind);
      dom.on(button, "click", () => {
        if (kind === value) return;

        request.abort();
        request = new AbortController();
        retries.reset();
        dates.clear();
        seen.clear();
        pictures.length = 0;
        list.replaceChildren();
        root.append(edge);
        totals.replaceChildren();
        kind = value;
        cursor = undefined;
        busy = false;
        element.scrollTop = 0;
        dom.set(root, "data-kind", kind);
        load();
      });

      tabs.append(button);
    }

    root.append(tabs, totals, list, edge);
    dom.set(root, "data-kind", kind);
    try {
      return await drawer({
        title: "assets.title",
        content: root,
        back: true,
        side: "right",
        direction: "→",
        ready: (target) => {
          element = target;
          observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) load();
            },
            { root: target, rootMargin: "128px" }
          );

          load();
        }
      });
    } finally {
      closed = true;
      request.abort();
      retries.reset();
      observer?.disconnect();
    }
  });
}

export function preview(kind, room = "") {
  const base = room ? `${path}/rooms/${room}/assets` : `${path}/assets`;
  const root = node("div", "assets-preview");
  const grid = node("div", "group");

  dom.set(grid, "data-view", "grid");

  root.append(grid);
  void api(`${base}?kind=${kind}`).then((result) => {
    if (!root.isConnected) return;

    grid.replaceChildren();
    if (!result.ok || !result.data.items.length) {
      grid.append(
        node("p", "assets-empty", i18n.message(result.ok ? "assets.empty" : "assets.error"))
      );

      return;
    }

    const items = result.data.items.slice(0, 6);

    for (const item of items) {
      const row = node("div", "group-item");
      const button = node("button", "asset-preview");

      button.type = "button";
      if (kind === "image") {
        const img = node("img");

        img.decoding = "async";
        img.alt = item.name || "";
        img.loading = "lazy";
        img.draggable = false;
        button.append(img);
        picture(img, { target: button, source: quality.thumb(item), lazy: true });
      } else {
        dom.set(button, "data-icon", kind === "file" ? "voice" : "link");
        button.append(node("span", "", item.name || new URL(item.url).hostname));
      }

      dom.on(button, "click", () => {
        if (kind === "image") {
          void view(item.url, button, "", undefined, items);
        } else {
          void link
            .open(item.url, { file: kind === "file", confirm: true, name: item.name || item.url })
            .catch(console.error);
        }
      });

      actions.bind(button, {
        ...item,
        kind,
        open:
          kind === "image"
            ? () => view(item.url, button, "", undefined, items)
            : () => link.open(item.url, { file: kind === "file", confirm: true, name: item.name })
      });

      row.append(button);
      grid.append(row);
    }

    mount(root);
  });

  return root;
}
