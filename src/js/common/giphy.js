import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import progress from "#common/progress";
import { giphy } from "#shared/attachment";

const key = import.meta.env.VITE_GIPHY_API_KEY;

i18n.preload("chatting.emoji.retry");

export const configured = Boolean(key);

const mounted = new Map();
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const visible = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    visible.unobserve(entry.target);
    const item = mounted.get(entry.target);

    if (item) {
      item.visible = true;
      void item.load();
    }
  }
});

const removed = new MutationObserver(() => {
  for (const [target, item] of mounted) {
    if (target.isConnected) item.connected = true;
    else if (item.connected) item.destroy();
  }
});

reduce.addEventListener("change", () => {
  for (const item of mounted.values()) if (item.visible) void item.load();
});

const request = async (path, params, signal) => {
  if (!key) throw new Error("GIPHY 설정 후 다시 시도해 주세요.");
  const url = new URL(`https://api.giphy.com/v1/${path}`);

  url.search = new URLSearchParams({ api_key: key, ...params });
  const response = await fetch(url, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer"
  });

  if (!response.ok) throw new Error("GIPHY 목록을 불러오지 못했습니다.");
  const body = await response.json();

  if (!Array.isArray(body.data)) throw new Error("Invalid GIPHY response");
  return body;
};

export const list = async (type, query, offset, signal, limit = 24) => {
  const path = `${type === "sticker" ? "stickers" : "gifs"}`;
  const result = await request(
    `${path}/${query ? "search" : "trending"}`,
    { ...(query && { q: query }), limit, offset, rating: "g", lang: "ko" },
    signal
  );

  return {
    items: result.data.map((item) => ({
      ...giphy({ type, provider: "giphy", id: item.id }),
      media: item
    })),
    next: offset + result.data.length,
    more:
      result.data.length > 0 &&
      offset + result.data.length < result.pagination?.total_count
  };
};

let queue = [];

const lookup = (id, signal) =>
  new Promise((resolve, reject) => {
    queue.push({ id, signal, resolve, reject });
    if (queue.length !== 1) return;
    queueMicrotask(async () => {
      const entries = queue;

      queue = [];
      const active = entries.filter((entry) => !entry.signal.aborted);
      const ids = [...new Set(active.map((entry) => entry.id))];

      for (const entry of entries) if (entry.signal.aborted) entry.resolve();
      for (let at = 0; at < ids.length; at += 100) {
        const batch = ids.slice(at, at + 100);
        const waiting = active.filter((entry) => batch.includes(entry.id));

        try {
          const result = await request("gifs", {
            ids: batch.join(","),
            rating: "g"
          });

          for (const entry of waiting)
            entry.resolve(result.data.find((item) => item.id === entry.id));
        } catch (error) {
          for (const entry of waiting) entry.reject(error);
        }
      }
    });
  });

const source = (value) => {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);

    return url.protocol === "https:" &&
      /(^|\.)giphy\.com$/.test(url.hostname) &&
      !url.username &&
      !url.password
      ? value
      : "";
  } catch {
    return "";
  }
};

export const resolve = async (id) => {
  if (!/^[a-zA-Z0-9]{1,80}$/.test(id)) return "";
  const data = await lookup(id, AbortSignal.timeout(10000));

  return source(data?.images?.original?.webp || data?.images?.original?.url);
};

// 미디어 주소는 저장하지 않고, 저장된 ID로 최신 주소를 다시 조회합니다.
export const image = (target, item, { signal, preview = false } = {}) => {
  const node = dom.create("img");
  const loading = progress({ type: "circular", value: 25, show: false });
  const retry = dom.create("span");
  const label = dom.create("span");
  const request = new AbortController();
  const abort = signal
    ? AbortSignal.any([signal, request.signal])
    : request.signal;

  let data = item.media;
  let active = false;
  let stopped = false;

  node.className = "chatting-emoji";
  node.loading = "lazy";
  node.draggable = false;
  node.referrerPolicy = "no-referrer";
  retry.className = "chatting-emote-retry";
  retry.textContent = i18n.message("chatting.emoji.retry");
  dom.set(retry, "data-i18n", "chatting.emoji.retry");
  retry.hidden = true;
  label.className = "chatting-giphy-credit";
  label.textContent = "GIPHY";
  target.append(node, loading.element, retry, label);

  const failed = () => {
    if (stopped) return;
    loading.element.hidden = true;
    node.hidden = true;
    retry.hidden = false;
    active = false;
  };

  const load = async () => {
    if (active || stopped || abort.aborted) return;
    active = true;
    retry.hidden = true;
    loading.element.hidden = false;
    try {
      data ||= await lookup(item.id, abort);
      if (stopped || abort.aborted) return;
      const images = data?.images;
      const still = reduce.matches || dom.has("wearable");
      const rendition = still
        ? images?.fixed_width_still
        : preview
          ? images?.fixed_width_small
          : images?.original;

      const url = source((!still && rendition?.webp) || rendition?.url);

      if (!url) throw new Error("Unavailable GIPHY media");
      node.alt = data.title || item.type;
      label.textContent = data.user?.display_name
        ? `${data.user.display_name} · GIPHY`
        : "GIPHY";
      node.hidden = false;
      node.src = url;
    } catch {
      if (!abort.aborted) failed();
    }
  };

  dom.on(node, "load", () => {
    loading.element.hidden = true;
    active = false;
  });
  dom.on(node, "error", failed);
  dom.on(retry, "pointerdown", (event) => event.preventDefault());
  dom.on(
    target,
    "click",
    (event) => {
      if (retry.hidden) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      data = undefined;
      void load();
    },
    true
  );
  const destroy = () => {
    if (stopped) return;
    stopped = true;
    request.abort();
    visible.unobserve(target);
    mounted.delete(target);
    if (!mounted.size) removed.disconnect();
    loading.destroy();
  };

  if (!mounted.size)
    removed.observe(document.body, { childList: true, subtree: true });
  mounted.set(target, {
    load,
    destroy,
    connected: target.isConnected,
    visible: false
  });
  visible.observe(target);
  signal?.addEventListener("abort", destroy, { once: true });
  return destroy;
};
