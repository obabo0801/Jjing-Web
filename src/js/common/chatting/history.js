import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as storage from "#common/storage";
import api from "#common/api";
import upload from "#common/upload";
import events, { isAdmin, isBlocked } from "#common/events";
import { append, regroup, atBottom, system } from "#common/chatting";
import toast from "#common/toast";
import progress from "#common/progress";
import { chatting as path } from "#shared/route";
import * as rules from "#shared/chatting";
import * as media from "#shared/attachment";
import attachments from "#common/chatting/attachment";

i18n.preload(
  "chatting.loadFailed",
  "chatting.unavailable",
  "chatting.sendFailed",
  "chatting.tooLong",
  "chatting.rate",
  "chatting.muted",
  "chatting.entered",
  "chatting.muteNotice",
  "chatting.kickNotice",
  "chatting.unkickNotice",
  "chatting.unblockNotice",
  "chatting.countdown",
  "chatting.remaining",
  "chatting.muteDetail",
  "chatting.reason",
  "chatting.handler",
  "chatting.retry",
  "image.sizeError",
  "image.uploadError",
  "chatting.audio.error",
  "chatting.audio.size"
);

const valid = (item) =>
  rules.validId(item?.url) &&
  Number.isSafeInteger(item.seq) &&
  item.seq > 0 &&
  typeof item.id === "string" &&
  typeof item.text === "string" &&
  typeof item.time === "string" &&
  typeof item.own === "boolean" &&
  (item.attachments === undefined || media.valid(item.attachments)) &&
  [item.image, item.preview, item.audio].every(
    (value) =>
      value === undefined ||
      (typeof value === "string" && /^\/(?!\/)/.test(value))
  ) &&
  (item.system === undefined || Object.hasOwn(rules.notices, item.system));

const request = async (query = {}, id) => {
  const url = id
    ? `${path}/${encodeURIComponent(id)}`
    : `${path}?${new URLSearchParams(query)}`;

  const response = await api(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });
  const page = response.data;

  if (
    !response.ok ||
    !Array.isArray(page?.messages) ||
    !Number.isSafeInteger(page.cursor) ||
    page.messages.some((item) => !valid(item))
  ) {
    throw new Error("Chatting query failed");
  }
  return page;
};

export default function history(root, messageId = "") {
  const list = dom.query(".chatting-list", root);
  const form = dom.query(".chatting-form", root);
  const input = dom.query(".chatting-input", root);
  const send = dom.query(".chatting-send", root);
  const voice = dom.query(".chatting-voice", root);
  const limit = dom.create("div");
  const remaining = dom.create("strong");
  const countdown = dom.create("span");
  const detail = dom.create("p");
  const reason = dom.create("p");
  const source = events();
  const attached = attachments(input);
  const rows = new Map();
  const tail = new Map();
  const hidden = new Set();
  const previous = dom.create("div");
  const next = dom.create("div");
  const retry = dom.create("button");
  const indicator = progress({ type: "circular", value: 25, show: false });
  const off = [];
  const notices = [];

  let generation = 0;
  let ready = false;
  let cursor = 0;
  let catching = false;
  let again = false;
  let loading = false;
  let sending = false;
  let after = false;
  let before = false;
  let destroyed = false;
  let halted = false;
  let joined = false;
  let highlight;
  let revision = 0;
  let staff = isAdmin();
  let muteTimer;
  let muted = 0;
  let restriction = {};
  let forward = false;
  let failed;
  let scrollFrame;

  previous.className = next.className = "chatting-page";
  retry.type = "button";
  retry.textContent = i18n.message("chatting.retry");
  dom.set(retry, "data-i18n", "chatting.retry");
  dom.set(retry, "data-response", "");

  limit.className = "chatting-limit";
  limit.hidden = true;
  limit.append(remaining, detail, reason);
  form.prepend(limit);
  const format = (key, values) =>
    i18n
      .message(key)
      .replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));

  const tick = () => {
    if (destroyed || halted) return;
    const seconds = Math.max(0, Math.ceil((muted - Date.now()) / 1000));

    input.disabled = seconds > 0;
    if (voice) voice.disabled = input.disabled;
    send.disabled = sending || input.disabled;
    limit.hidden = !seconds;
    countdown.textContent = format("chatting.countdown", {
      seconds: String(seconds).padStart(2, "0")
    });
    const [prefix = "", suffix = ""] = i18n
      .message("chatting.remaining")
      .split("{time}");

    remaining.replaceChildren(prefix, countdown, suffix);
    detail.hidden = !restriction.seconds;
    detail.textContent = format("chatting.muteDetail", {
      handler: restriction.handler || i18n.message("chatting.handler"),
      seconds: restriction.seconds
    });
    reason.hidden = !restriction.reason;
    reason.textContent = format("chatting.reason", restriction);
    if (seconds) muteTimer = setTimeout(tick, 1000);
  };

  const mute = (value) => {
    if (value === undefined || halted || destroyed) return;
    const next = typeof value === "object" && value ? value : { until: value };
    const stamp = next.until
      ? Date.parse(`${next.until.replace(" ", "T")}+09:00`)
      : 0;

    if (Number.isFinite(stamp) && stamp >= muted) {
      muted = stamp;
      restriction = { ...restriction, ...next };
    }
    clearTimeout(muteTimer);
    tick();
  };

  list.append(previous, next);
  input.maxLength = rules.length;

  const notice = (key) => toast({ text: key, type: "error" });
  const controls = () => {
    const position = anchor();

    previous.hidden = ready && !before && !(loading && !forward);
    next.hidden = !after && !(loading && forward);
    indicator.element.hidden = !loading || halted;
    if (loading) (forward ? next : previous).append(indicator.element);
    if (failed) {
      failed.hidden = false;
      failed.append(retry);
    } else retry.remove();
    retry.disabled = loading || halted;
    if (position?.node.isConnected)
      list.scrollTop +=
        position.node.getBoundingClientRect().top - position.top;
    dom.set(
      root,
      "data-history",
      String(Boolean(after || (messageId && !ready)))
    );
    list.dispatchEvent(new Event("scroll"));
  };

  function anchor() {
    const top = list.getBoundingClientRect().top;
    const item = [...rows.values()].find(
      (row) => !row.node.hidden && row.node.getBoundingClientRect().bottom > top
    );

    return item
      ? { node: item.node, top: item.node.getBoundingClientRect().top }
      : null;
  }

  const insert = (messages, follow = false, reveal = false) => {
    const added = messages
      .filter((item) => !rows.has(item.url))
      .sort((a, b) => a.seq - b.seq);

    if (!added.length) {
      if (follow) list.scrollTop = list.scrollHeight;
      return controls();
    }
    const position = anchor();
    const existing = [...rows.values()];

    for (const item of added) {
      if (rows.has(item.url)) continue;
      if (!item.system && storage.get(`chatting-hide:${item.id}`) === "true")
        hidden.add(item.id);
      item.hidden = !item.system && hidden.has(item.id);
      const node = append(list, item, false);

      if (!node) continue;
      if (reveal) dom.set(node, "data-reveal", "");
      node.hidden = item.hidden;
      const later = existing.find((row) => row.item.seq > item.seq);

      list.insertBefore(node, later?.node || next);
      rows.set(item.url, { node, item });
    }
    if (existing.length && added[0].seq < existing.at(-1).item.seq) {
      const sorted = [...rows.entries()].sort(
        (a, b) => a[1].item.seq - b[1].item.seq
      );

      rows.clear();
      sorted.forEach(([key, value]) => rows.set(key, value));
    }
    regroup(list);
    controls();
    if (follow) list.scrollTop = list.scrollHeight;
    else if (position?.node.isConnected)
      list.scrollTop +=
        position.node.getBoundingClientRect().top - position.top;
    list.dispatchEvent(new Event("scroll"));
  };

  const focus = async (id, version) => {
    // 프로필이 비동기로 바뀌어도 article 높이에 영향을 주지 않도록
    // 이름 한 줄과 아바타 크기는 CSS에서 고정합니다.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (destroyed || version !== generation) return;
    const node = rows.get(id)?.node;

    if (!node || node.hidden) {
      notice("chatting.unavailable");
      return;
    }
    list.scrollTop +=
      node.getBoundingClientRect().top -
      list.getBoundingClientRect().top -
      list.clientHeight / 3;
    dom.set(node, "data-highlight", "");
    clearTimeout(highlight);
    highlight = setTimeout(() => dom.remove(node, "data-highlight"), 2000);
  };

  const recover = async () => {
    again = true;
    if (!ready || catching || destroyed || halted) return;
    catching = true;
    const version = generation;

    try {
      while (again && version === generation && !destroyed) {
        again = false;
        let more;

        do {
          const page = await request({ after: cursor });

          if (version !== generation || destroyed) return;
          mute(page.restriction || page.muted);
          if (page.more && page.cursor <= cursor)
            throw new Error("Invalid cursor");
          if (after) page.messages.forEach((item) => tail.set(item.url, item));
          else insert(page.messages, !messageId && atBottom(list));
          cursor = page.cursor;
          more = page.more;
        } while (more);
      }
    } catch {
      if (version === generation) notice("chatting.loadFailed");
    } finally {
      catching = false;
      if ((again || version !== generation) && ready) recover();
    }
  };

  const receive = (item, follow = false) => {
    if (destroyed || halted) return;
    if (follow && valid(item)) {
      if (ready) insert([item], true);
      else notices.push(item);
    }
    if (!valid(item) || !ready || catching) return recover();
    if (item.seq <= cursor) return;
    // 번호가 건너뛰면 삭제·비공개 메시지 여부도 DB에서 확인합니다.
    if (
      item.seq !== cursor + 1 ||
      (!isAdmin() && (item.blocked || isBlocked(item.id)))
    )
      return recover();
    if (after) tail.set(item.url, item);
    else if (!follow) insert([item], !messageId && atBottom(list));
    cursor = item.seq;
  };

  const load = async (id = "") => {
    if (destroyed || halted) return;
    const version = ++generation;

    ready = false;
    loading = true;
    forward = false;
    failed = null;
    controls();
    try {
      if (id && !rules.validId(id)) throw new Error("Invalid ID");
      const page = await request({ live: "1" }, id);

      if (version !== generation || destroyed) return;
      mute(page.restriction || page.muted);
      staff = Boolean(page.history);
      list.replaceChildren(previous, next);
      rows.clear();
      tail.clear();
      cursor = page.cursor;
      before = id ? page.before : Boolean(page.history && page.more);
      after = id ? page.after : false;
      ready = true;
      insert(page.messages, !id, true);
      if (!joined) {
        joined = true;
        system(list, { text: "chatting.entered" });
      }
      if (id) await focus(id, version);
      if (version !== generation || destroyed || halted) return;
      if (notices.length) insert(notices.splice(0), true);
    } catch {
      if (version !== generation || destroyed) return;
      notice(id ? "chatting.unavailable" : "chatting.loadFailed");
      failed = previous;
    } finally {
      if (version === generation) {
        loading = false;
        controls();
        if (ready) recover();
      }
    }
  };

  const page = async (direction) => {
    if (loading || halted || destroyed) return;
    if (!ready) return load(messageId);
    const items = [...rows.values()];
    const edge = direction ? items.at(-1) : items[0];
    const version = generation;

    if (!edge) return;
    loading = true;
    forward = direction;
    failed = null;
    controls();
    try {
      const result = await request({
        [forward ? "after" : "before"]: edge.item.seq
      });

      if (version !== generation || destroyed) return;
      if (
        result.more &&
        !result.messages.some((item) =>
          forward ? item.seq > edge.item.seq : item.seq < edge.item.seq
        )
      )
        throw new Error("Invalid page cursor");
      mute(result.restriction || result.muted);
      if (forward) after = result.more;
      else before = result.more;
      insert(result.messages, false, true);
      if (!after) {
        insert([...tail.values()]);
        tail.clear();
      }
    } catch {
      if (version === generation && !halted && !destroyed) {
        failed = forward ? next : previous;
        notice("chatting.loadFailed");
      }
    } finally {
      if (version === generation) {
        loading = false;
        controls();
      }
    }
  };

  const nearby = () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      if (!ready || loading || halted || destroyed || failed) return;
      const rect = list.getBoundingClientRect();
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);

      if (bottom <= top) return;
      if (
        before &&
        previous.getBoundingClientRect().bottom >= top - 128 &&
        previous.getBoundingClientRect().top <= bottom
      )
        page(false);
      else if (
        after &&
        next.getBoundingClientRect().top <= bottom + 128 &&
        next.getBoundingClientRect().bottom >= top
      )
        page(true);
    });
  };

  const transmit = async (file = null) => {
    const audio = file?.type.startsWith("audio/");
    const batch = file ? [] : attached.snapshot();
    const value = input.value;
    const edited = revision;
    const version = generation;

    if (
      sending ||
      input.disabled ||
      input.readOnly ||
      halted ||
      destroyed ||
      (!file && !value.trim() && !batch.length)
    )
      return false;
    if (!file && value.length > rules.length) {
      notice("chatting.tooLong");
      return false;
    }
    sending = true;
    attached.busy(true);
    send.disabled = true;
    try {
      const items = [];

      for (const item of batch) {
        if (item.type === "ogq") {
          items.push(media.ogq(item));
          continue;
        }
        const result =
          item.receipt?.expires > Date.now()
            ? { ok: true, data: item.receipt }
            : await upload(`${path}/attachment`, item, {
                cache: "no-store",
                signal: AbortSignal.timeout(60_000)
              });

        if (!result.ok || !rules.validId(result.data?.token)) {
          notice(
            result.status === 413 ? "image.sizeError" : "image.uploadError"
          );
          return false;
        }
        if (destroyed || halted) return false;
        attached.receipt(item, result.data);
        items.push({
          type: item.type,
          token: result.data.token,
          description: item.description,
          spoiler: item.spoiler
        });
      }
      const result = file
        ? await upload(`${path}/${audio ? "audio" : "image"}`, file, {
            cache: "no-store"
          })
        : await api(path, {
            method: "POST",
            cache: "no-store",
            data: { text: value, attachments: items }
          });

      if (destroyed || halted) return false;
      if (!result.ok || !valid(result.data)) {
        if (result.status === 400)
          batch.forEach((item) => attached.receipt(item, null));
        if (result.status === 423)
          mute(result.data?.restriction || result.data?.until);
        let key = audio ? "chatting.audio.error" : "image.uploadError";

        if (!file) key = "chatting.sendFailed";
        if (result.status === 413)
          key = audio ? "chatting.audio.size" : "image.sizeError";
        if (result.status === 429) key = "chatting.rate";
        if (result.status === 423) key = "chatting.muted";
        notice(key);
        return false;
      }
      if (!file && input.value === value && revision === edited) {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      attached.clear(batch);
      if (version === generation) await receive(result.data);
      form.dispatchEvent(new Event("chatting-sent"));
      return true;
    } finally {
      sending = false;
      attached.busy(false);
      send.disabled = halted || Boolean(input.disabled);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    transmit();
  };

  const openLatest = () => {
    if (after || messageId || !ready) {
      messageId = "";
      load();
    }
  };

  off.push(dom.on(form, "submit", submit));
  off.push(dom.on(input, "input", () => revision++));
  off.push(dom.on(retry, "click", () => page(failed === next)));
  off.push(dom.on(list, "scroll", nearby, { passive: true }));
  off.push(dom.on(window, "scroll", nearby, { passive: true, capture: true }));
  off.push(dom.on(window, "resize", nearby, { passive: true }));
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(nearby);

    observer.observe(list);
    off.push(() => observer.disconnect());
  }
  off.push(
    dom.on(source, "mute", (event) => {
      if (halted || destroyed) return;
      try {
        const data = JSON.parse(event.data);

        mute(data);
        receive(data.message, true);
      } catch {}
    })
  );

  off.push(
    dom.on(window, "chatting-stop", () => {
      halted = true;
      ready = false;
      generation++;
      clearTimeout(muteTimer);
      clearTimeout(highlight);
      input.disabled = send.disabled = retry.disabled = true;
      cancelAnimationFrame(scrollFrame);
      indicator.element.hidden = true;
      if (voice) voice.disabled = true;
      off.forEach((remove) => remove());
    })
  );

  off.push(dom.on(root, "chatting-latest", openLatest));
  off.push(
    dom.on(root, "chatting-hide", (event) => {
      const { id, hidden: hide } = event.detail;

      if (hide) hidden.add(id);
      else hidden.delete(id);
      storage.set(`chatting-hide:${id}`, hide);
      rows.forEach((row) => {
        if (row.item.id === id) {
          row.item.hidden = hide;
          row.node.hidden = hide;
        }
      });
      regroup(list);
    })
  );

  off.push(
    dom.on(source, "chatting", (event) => {
      let item;

      try {
        item = JSON.parse(event.data);
      } catch {
        return recover();
      }
      receive(item);
    })
  );

  off.push(
    dom.on(source, "ready", () => {
      if (staff === isAdmin()) return recover();
      staff = isAdmin();
      rows.clear();
      list.replaceChildren(previous, next);
      load(messageId);
    })
  );

  off.push(
    dom.on(source, "role", () => {
      staff = isAdmin();
      // 이미 받은 관리자 전용 메시지도 권한 변경 즉시 제거합니다.
      rows.clear();
      list.replaceChildren(previous, next);
      load(messageId);
    })
  );
  for (const type of ["chatting-block", "chatting-unblock"])
    off.push(
      dom.on(source, type, (event) => {
        try {
          const { id } = JSON.parse(event.data);

          if (!isAdmin() && type === "chatting-block") {
            rows.forEach((row, url) => {
              if (row.item.id !== id) return;
              row.node.remove();
              rows.delete(url);
            });
            regroup(list);
          }
          recover();
        } catch {}
      })
    );
  off.push(dom.on(window, "online", recover));
  off.push(
    dom.on(document, "visibilitychange", () => {
      if (!document.hidden) recover();
    })
  );
  const initial = load(messageId);

  return {
    initial,
    recover,
    image: attached.add,
    attach: attached.add,
    audio: (file) => transmit(file),
    destroy: () => {
      destroyed = true;
      attached.destroy();
      generation++;
      clearTimeout(highlight);
      clearTimeout(muteTimer);
      cancelAnimationFrame(scrollFrame);
      indicator.destroy();
      input.disabled = halted;
      send.disabled = halted;
      if (voice) voice.disabled = halted;
      limit.remove();
      off.forEach((remove) => remove());
      previous.remove();
      next.remove();
    }
  };
}
