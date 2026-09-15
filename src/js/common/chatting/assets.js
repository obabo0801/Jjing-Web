import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as clock from "#common/chatting/time";
import { chatting as path } from "#shared/route";
import api from "#common/api";
import drawer from "#common/drawer";
import view from "#common/image/view";
import mount from "#common/mount";
import progress from "#common/progress";
import retry from "#common/retry";
import format from "#common/format";
import once from "#common/once";
import "../../../css/common/chatting-assets.css";

const opening = once();
const kinds = ["image", "file", "link"];

i18n.preload(
  "assets.title",
  "assets.summary",
  "assets.megabytes",
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
    const loading = progress({ type: "circular", value: 25, show: false });
    const dates = new Map();
    const seen = new Set();

    let kind = kinds.includes(selected) ? selected : "image";
    let cursor;
    let busy = false;
    let closed = false;
    let request = new AbortController();
    let observer;
    let links;
    let element;

    const retries = retry(load, () => !closed);
    const image = (src, title) => {
      const img = node("img");

      img.src = src;
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
        section.append(
          node("h3", "group-title", clock.label(item.time)),
          group
        );
        list.append(section);
        dates.set(day, group);
      }
      const row = node("div", "group-item");
      const button = node(kind === "image" ? "button" : "a", "asset");

      if (kind === "image") {
        button.type = "button";
        const img = image(item.preview || item.url, item.name);

        button.append(img);
        dom.on(button, "click", () => view(item.url, button));
      } else {
        button.href = item.url;
        button.target = "_blank";
        button.rel = "noopener noreferrer";
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
              item.size === null
                ? i18n.message("assets.unknown")
                : format(item.size)
            )
          );
        } else {
          const description = node("small", "asset-detail");
          const address = node("span", "asset-address", item.url);

          description.hidden = true;
          body.append(description, address);
          dom.set(button, "data-asset", item.id);
          links.observe(button);
        }
      }
      row.append(button);
      dates.get(day).append(row);
    };

    async function load() {
      if (busy || closed || cursor === null) return;
      busy = true;
      observer?.unobserve(edge);
      edge.replaceChildren(loading.element);
      const signal = request.signal;
      const query = new URLSearchParams({ kind });

      if (cursor) query.set("before", cursor);
      const result = await api(`${base}?${query}`, { signal });

      if (closed || signal.aborted) return;
      busy = false;
      if (!result.ok) {
        if ([400, 401, 403, 404].includes(result.status))
          edge.replaceChildren(node("p", "", i18n.message("assets.error")));
        else retries.schedule();
        return;
      }
      retries.reset();
      const data = result.data;

      const size =
        data.size === null
          ? i18n.message("assets.unknown")
          : i18n
              .message("assets.megabytes")
              .replace(
                "{size}",
                new Intl.NumberFormat(dom.root.lang, {
                  maximumFractionDigits: 2
                }).format(data.size / 1048576)
              );

      totals.textContent = i18n
        .message("assets.summary")
        .replace("{count}", data.count)
        .replace("{size}", size);
      data.items.forEach(render);
      cursor = data.next;
      edge.replaceChildren();
      if (!seen.size)
        edge.append(node("p", "assets-empty", i18n.message("assets.empty")));
      mount(root);
      if (cursor !== null) observer?.observe(edge);
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
        links.disconnect();
        dates.clear();
        seen.clear();
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

          links = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const button = entry.target;

                links.unobserve(button);
                const signal = request.signal;

                void api(`${base}/${dom.get(button, "data-asset")}`, {
                  signal
                }).then((result) => {
                  if (!result.ok || signal.aborted || closed) return;
                  const data = result.data;

                  if (data.title)
                    dom.query(".asset-title", button).textContent = data.title;
                  const description = dom.query(".asset-detail", button);

                  description.textContent = data.description;
                  description.hidden = !data.description;
                  if (data.image) {
                    const img = image(data.image, "");
                    const icon = dom.query(".asset-icon", button);

                    dom.on(img, "error", () => img.replaceWith(icon));
                    icon.replaceWith(img);
                  }
                });
              }
            },
            { root: target, rootMargin: "64px" }
          );
          load();
        }
      });
    } finally {
      closed = true;
      request.abort();
      retries.reset();
      observer?.disconnect();
      links?.disconnect();
      loading.destroy();
    }
  });
}

export function preview(kind, room = "") {
  const base = room ? `${path}/rooms/${room}/assets` : `${path}/assets`;
  const root = node("div", "assets-preview");
  const grid = node("div", "group");
  const loading = progress({ type: "circular", value: 25, show: false });

  dom.set(grid, "data-view", "grid");
  grid.append(loading.element);
  root.append(grid);
  void api(`${base}?kind=${kind}`).then((result) => {
    loading.destroy();
    if (!root.isConnected) return;
    grid.replaceChildren();
    if (!result.ok || !result.data.items.length) {
      grid.append(
        node(
          "p",
          "assets-empty",
          i18n.message(result.ok ? "assets.empty" : "assets.error")
        )
      );
      return;
    }
    for (const item of result.data.items.slice(0, 6)) {
      const row = node("div", "group-item");
      const button = node("button", "asset-preview");

      button.type = "button";
      if (kind === "image") {
        const img = node("img");

        img.src = item.preview || item.url;
        img.alt = item.name || "";
        img.loading = "lazy";
        img.draggable = false;
        button.append(img);
      } else {
        dom.set(button, "data-icon", kind === "file" ? "voice" : "link");
        button.append(
          node("span", "", item.name || new URL(item.url).hostname)
        );
      }
      dom.on(button, "click", () => assets(kind, room));
      row.append(button);
      grid.append(row);
    }
    mount(root);
  });
  return root;
}
