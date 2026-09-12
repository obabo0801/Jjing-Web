import * as dom from "#common/dom";
import * as input from "#common/input";
import * as emoji from "#common/emoji";
import * as i18n from "#common/i18n";
import * as back from "#common/back";
import { atBottom } from "#common/chatting";
import * as recent from "#common/chatting/recent";
import * as catalog from "#common/chatting/catalog";
import * as giphy from "#common/giphy";
import toast from "#common/toast";
import progress from "#common/progress";
import swipe from "#common/swipe";
import api from "#common/api";
import dialog from "#common/dialog";
import * as route from "#shared/route";
import * as attachment from "#shared/attachment";

i18n.preload(
  "chatting.emoji.basic",
  "chatting.emoji.unavailable",
  "chatting.emoji.clear",
  "chatting.emoji.recent",
  "chatting.emoji.ogq",
  "chatting.send",
  "dialog.cancel",
  "data.delete.confirm",
  "chatting.retry",
  "chatting.emoji.empty",
  "chatting.emoji.retry",
  "chatting.emoji.failed",
  "chatting.emoji.removeRecent"
);

const types = [
  ["emoji", "chatting.emoji.emoji"],
  ["gif", "chatting.emoji.gif"],
  ["sticker", "chatting.emoji.sticker"],
  ["kaomoji", "chatting.emoji.kaomoji"],
  ["emote", "chatting.emoji.basic"],
  ["ogq", "chatting.emoji.ogq"]
];

i18n.preload(...types.map(([, title]) => title));
i18n.preload(
  ...[
    ...catalog.unicode,
    ...catalog.kaomoji,
    ...catalog.categories.gif,
    ...catalog.categories.sticker
  ].map((group) => group.title)
);

const state = {
  head: null,
  tabs: 0,
  categories: new Map(),
  scroll: new Map(),
  positions: new Map()
};

const key = (group) =>
  `${group.type}:${group.items?.[0]?.ogq_id || group.title}`;

export default function select(field, attach) {
  const root = dom.create("div");
  const tabs = dom.create("div");
  const kinds = dom.create("div");
  const grid = dom.create("div");
  const head = dom.create("div");
  const footer = dom.create("footer");
  const credit = dom.create("a");
  const form = field.form;
  const chat = form.closest(".chatting");

  if (chat.hasAttribute("data-emotes")) return Promise.resolve();
  const list = dom.query(".chatting-list", chat);
  const stick = atBottom(list);
  const preview = field.closest(".input");
  const value = dom.query(".chatting-editor", preview) || field;
  const actions = dom.query(".input-actions", preview);
  const toggle = dom.query(".chatting-more", actions);
  const loading = progress({ type: "circular", value: 25, show: false });
  const groups = [];
  const basic = [
    { title: "chatting.emoji.recent", type: "recent", items: [] },
    {
      title: "chatting.emoji.emoji",
      type: "emoji",
      icon: "smile",
      categories: catalog.unicode
    },
    {
      title: "chatting.emoji.gif",
      type: "gif",
      icon: "image",
      categories: catalog.categories.gif
    },
    {
      title: "chatting.emoji.sticker",
      type: "sticker",
      icon: "gift",
      categories: catalog.categories.sticker
    },
    {
      title: "chatting.emoji.kaomoji",
      type: "kaomoji",
      icon: "language",
      categories: catalog.kaomoji
    }
  ];
  const off = [];

  let closed = false;
  let index = 0;
  let view;
  let restoring = false;
  let position;
  let frame;
  let press;
  let confirming = false;
  let held = false;
  let request;
  let page;
  let fetching = false;
  let retryTimer;
  let attempts = 0;
  let closing;
  let gesture;
  let animation;

  root.className = "chatting-emotes";
  tabs.className = "segment";
  kinds.className = "segment";
  grid.className = "group chatting-emojis";
  dom.set(grid, "data-view", "grid");
  head.className = "chatting-emote-head";
  footer.className = "chatting-emote-footer";
  credit.className = "chatting-emote-credit";
  credit.href = "https://giphy.com/";
  credit.target = "_blank";
  credit.rel = "noopener noreferrer";
  credit.textContent = "Powered by GIPHY";
  footer.append(loading.element, credit);
  dom.set(toggle, "data-icon", "close");
  dom.set(toggle, "data-tooltip", "dialog.cancel");
  head.append(tabs);
  root.append(head, grid);
  form.before(root);
  dom.set(chat, "data-emotes", "");
  form.dispatchEvent(new Event("chatting-state"));
  if (stick) list.scrollTop = list.scrollHeight;
  if (document.activeElement === value) value.blur();
  field.dispatchEvent(new Event("chatting-viewport", { bubbles: true }));
  off.push(
    dom.on(root, "pointerdown", (event) => {
      if (event.target.closest("button")) event.preventDefault();
    })
  );
  off.push(dom.on(form, "chatting-sent", () => closing?.()));
  off.push(dom.on(form, "chatting-emotes-close", () => closing?.()));
  off.push(dom.on(window, "chatting-stop", () => closing?.()));
  off.push(back.add(() => closing?.()));
  off.push(
    dom.on(document, "pointerdown", (event) => {
      const path = event.composedPath();

      if (confirming || path.includes(root) || path.includes(form)) return;
      if (event.target.closest("dialog, .layer, .popover")) return;
      closing?.();
    })
  );

  off.push(
    dom.on(value, "keydown", (event) => {
      if (event.defaultPrevented || event.isComposing || event.key !== "Escape")
        return;
      event.preventDefault();
      closing?.();
    })
  );

  const retry = (run, text = "chatting.retry") => {
    const row = dom.create("div");
    const button = dom.create("button");

    row.className = "chatting-emote-status";
    button.type = "button";
    button.textContent = i18n.message(text);
    dom.set(button, "data-i18n", text);
    dom.on(button, "click", () => {
      row.remove();
      void run();
    });
    row.append(button);
    grid.insertBefore(row, footer);
    return row;
  };

  const display = (items, append = false) => {
    if (!append) grid.replaceChildren(kinds, footer);
    for (const item of items) {
      const row = dom.create("div");
      const button = dom.create("button");
      const sticker = item.type === "ogq";
      const remote = item.provider === "giphy";
      const value =
        typeof item === "string" ? item : item.value || item.keyword;
      const entry = emoji.get(value);

      row.className = "group-item";
      button.className = "icon-center";
      button.type = "button";
      if (remote) {
        dom.set(row, "data-giphy", item.type);
        giphy.image(button, item, { signal: request.signal, preview: true });
      } else if (sticker) {
        const image = dom.create("img");

        dom.set(row, "data-ogq", "");
        image.className = "chatting-emoji";
        image.src = attachment.source(item);
        image.alt = i18n.message("chatting.emoji.ogq");
        image.width = image.height = 160;
        image.loading = "lazy";
        image.draggable = false;
        image.referrerPolicy = "no-referrer";
        button.append(image);
        dom.on(image, "error", () => {
          image.hidden = true;
          button.textContent = i18n.message("chatting.emoji.retry");
          dom.set(button, "data-i18n", "chatting.emoji.retry");
          dom.set(button, "data-retry", "");
        });

        dom.on(button, "click", (event) => {
          if (!button.hasAttribute("data-retry")) return;
          event.stopImmediatePropagation();
          dom.remove(button, "data-retry");
          dom.remove(button, "data-i18n");
          button.replaceChildren(image);
          image.hidden = false;
          image.src = attachment.source(item);
        });
      } else if (entry || item.src) {
        button.append(emoji.image(entry || item, true));
      } else button.textContent = value;
      dom.set(button, "data-response", "");
      if (!sticker && !remote) dom.set(button, "data-tooltip", value);
      dom.on(button, "click", () => {
        if (gesture || field.disabled || field.readOnly) return;
        if (sticker || remote) {
          if (attach?.(item)) {
            recent.remember(item);
            tabs.children[0].disabled = false;
            if (groups[index].type === "recent") render();
          }
          return;
        }
        if (input.insert(field, value, false)) {
          const type = item.type || groups[index].type;

          recent.remember({ type: type === "recent" ? "emoji" : type, value });
          tabs.children[0].disabled = false;
          if (groups[index].type === "recent") render();
        } else toast({ text: "chatting.tooLong", type: "warning" });
      });
      row.append(button);
      grid.insertBefore(row, footer);
    }
  };

  const size = () => (dom.has("wearable") ? 6 : dom.has("small") ? 12 : 24);

  const save = () => {
    if (view && !restoring && page)
      state.positions.set(view, { top: grid.scrollTop, count: page.offset });
    if (groups[index] && state.head === key(groups[index]))
      state.tabs = tabs.scrollLeft;
  };

  function advance() {
    if (!page || closed || fetching || page.error) return;
    if (restoring) {
      grid.scrollTop = position.top;
      if (page.more && page.offset < position.count) {
        void load();
        return;
      }
      restoring = false;
    }
    save();
    if (
      page.more &&
      grid.scrollHeight - grid.clientHeight - grid.scrollTop < 80
    )
      void load();
  }

  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(advance);
  };

  async function load() {
    if (!page?.more || fetching || closed) return;
    const current = page;
    const signal = request.signal;

    fetching = true;
    current.error = false;
    loading.element.hidden = false;
    current.failure?.remove();
    current.failure = undefined;
    try {
      if (current.items) {
        const next = current.items.slice(
          current.offset,
          current.offset + size() * 2
        );

        display(next, true);
        current.offset += next.length;
        current.more = current.offset < current.items.length;
      } else {
        const result = await giphy.list(
          current.type,
          current.query,
          current.offset,
          signal,
          size()
        );

        if (signal.aborted || closed) return;
        const items = result.items.filter((item) => {
          if (current.seen.has(item.id)) return false;
          current.seen.add(item.id);
          return true;
        });

        display(items, true);
        current.more =
          result.more && result.next > current.offset && items.length > 0;
        current.offset = result.next;
      }
      if (restoring) grid.scrollTop = position.top;
      if (!current.offset) {
        const empty = dom.create("p");

        empty.className = "chatting-emote-status";
        empty.textContent = i18n.message("chatting.emoji.empty");
        dom.set(empty, "data-i18n", "chatting.emoji.empty");
        dom.set(grid, "data-empty", "");
        grid.insertBefore(empty, footer);
      }
    } catch {
      if (!signal.aborted && !closed) {
        current.error = true;
        current.failure = retry(load);
      }
    } finally {
      if (!signal.aborted) {
        fetching = false;
        loading.element.hidden = true;
        schedule();
      }
    }
  }

  function render(reset = false) {
    if (!reset) save();
    const used = new Set(recent.recent().map((item) => item.type));
    const empty = !types.some(([type]) => used.has(type));

    tabs.children[0].disabled = empty;
    if (groups[index].type === "recent" && empty) {
      index = 1;
      state.head = key(groups[index]);
      [...tabs.children].forEach((button, at) =>
        button.toggleAttribute("data-selected", at === index)
      );
    }
    cancelAnimationFrame(frame);
    request?.abort();
    request = new AbortController();
    fetching = false;
    page = undefined;
    loading.element.hidden = true;
    const group = groups[index];
    const groupKey = key(group);
    const choices =
      group.type === "recent"
        ? types.map(([type, title]) => ({ type, title }))
        : group.categories || [];

    let at = state.categories.get(groupKey) || 0;

    if (group.type === "recent" && !used.has(choices[at]?.type))
      at = Math.max(
        0,
        choices.findIndex((choice) => used.has(choice.type))
      );
    at = Math.min(at, Math.max(0, choices.length - 1));
    state.categories.set(groupKey, at);
    kinds.replaceChildren();
    kinds.hidden = !choices.length;
    choices.forEach((choice, position) => {
      const button = dom.create("button");

      button.type = "button";
      button.textContent = choice.icon || i18n.message(choice.title);
      if (!choice.icon) dom.set(button, "data-i18n", choice.title);
      dom.set(button, "data-tooltip", choice.title);
      button.toggleAttribute("data-selected", position === at);
      if (group.type === "recent") {
        dom.set(button, "data-recent", choice.type);
        button.disabled = !used.has(choice.type);
      }
      dom.on(button, "click", () => {
        if (position === at) return;
        save();
        state.categories.set(groupKey, position);
        state.scroll.set(groupKey, kinds.scrollLeft);
        render();
      });
      kinds.append(button);
    });
    const choice = choices[at];
    const type = group.type === "recent" ? choice.type : group.type;

    view = `${groupKey}:${at}`;
    position = state.positions.get(view) || { top: 0, count: 0 };
    restoring = position.count > 0;
    dom.set(grid, "data-kind", type);
    const remote = ["gif", "sticker"].includes(group.type);
    const items =
      group.type === "recent"
        ? recent.recent().filter((item) => item.type === type)
        : choice?.items || group.items;

    credit.hidden = !["gif", "sticker"].includes(type);
    dom.remove(grid, "data-empty");
    display([]);
    page = {
      type,
      query: choice?.query,
      offset: 0,
      more: true,
      items: remote ? null : items,
      seen: new Set(),
      error: false
    };
    grid.scrollTop = 0;
    void load();
    kinds.scrollLeft = state.scroll.get(groupKey) || 0;
    const selected = kinds.children[at];

    if (selected) {
      const left = selected.offsetLeft - kinds.offsetLeft;

      if (left < kinds.scrollLeft) kinds.scrollLeft = left;
      else if (
        left + selected.offsetWidth >
        kinds.scrollLeft + kinds.clientWidth
      )
        kinds.scrollLeft = left + selected.offsetWidth - kinds.clientWidth;
    }
  }

  off.push(
    dom.on(kinds, "scroll", () => {
      state.scroll.set(key(groups[index]), kinds.scrollLeft);
    })
  );

  const cancel = () => {
    clearTimeout(press?.timer);
    press = undefined;
  };

  const removeRecent = async (button) => {
    cancel();
    if (closed || confirming || button.disabled || !button.isConnected) return;
    const type = dom.get(button, "data-recent");
    const title =
      type === "all"
        ? "chatting.emoji.recent"
        : types.find(([name]) => name === type)?.[1];

    if (!title) return;
    confirming = true;
    try {
      const confirmed = await dialog({
        title,
        content: "chatting.emoji.removeRecent",
        direction: "→",
        actions: [
          { text: "dialog.cancel", icon: "close", value: false },
          {
            text: "data.delete.confirm",
            icon: "trash",
            value: true,
            data: ["data-danger"]
          }
        ]
      });

      if (!confirmed || closed) return;
      recent.clear(type === "all" ? undefined : type);
      const at = types.findIndex(([name]) => name === type);

      for (const name of state.positions.keys())
        if (
          name.startsWith("recent:") &&
          (type === "all" || name.endsWith(`:${at}`))
        )
          state.positions.delete(name);
      if (groups[index].type === "recent") render(true);
    } finally {
      confirming = false;
    }
  };

  off.push(cancel);
  off.push(
    dom.on(root, "pointerdown", (event) => {
      cancel();
      const button = event.target.closest("[data-recent]");

      if (
        !button ||
        button.disabled ||
        confirming ||
        event.pointerType === "mouse" ||
        event.button !== 0 ||
        event.isPrimary === false
      )
        return;
      press = { id: event.pointerId, x: event.clientX, y: event.clientY };
      press.timer = setTimeout(() => {
        held = true;
        void removeRecent(button);
      }, 500);
    })
  );

  off.push(
    dom.on(document, "pointermove", (event) => {
      if (
        press?.id === event.pointerId &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10
      )
        cancel();
    })
  );

  off.push(
    dom.on(document, "pointerup", () => {
      cancel();
      if (held)
        setTimeout(() => {
          held = false;
        });
    })
  );
  off.push(dom.on(document, "pointercancel", cancel));
  off.push(dom.on(window, "blur", cancel));
  off.push(
    dom.on(
      root,
      "click",
      (event) => {
        if (!held || !event.target.closest("[data-recent]")) return;
        held = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true
    )
  );

  off.push(
    dom.on(root, "contextmenu", (event) => {
      const button = event.target.closest("[data-recent]");

      if (!button) return;
      event.preventDefault();
      void removeRecent(button);
    })
  );

  off.push(
    dom.on(
      tabs,
      "scroll",
      () => {
        cancel();
        save();
      },
      { passive: true }
    )
  );

  off.push(
    dom.on(
      grid,
      "scroll",
      () => {
        cancel();
        save();
        schedule();
      },
      { passive: true }
    )
  );
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) schedule();
    },
    { root: grid, rootMargin: "0px 0px 80px 0px" }
  );
  const resize = new ResizeObserver(schedule);

  observer.observe(footer);
  resize.observe(grid);
  off.push(
    () => observer.disconnect(),
    () => resize.disconnect()
  );

  const animate = (frames, dragging = false) => {
    animation?.cancel();
    animation = grid.animate(frames, {
      duration: dragging
        ? 1000
        : matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 160,
      easing: dragging ? "linear" : "ease-out",
      fill: dragging ? "both" : "none"
    });
  };

  const select = (next, direction = -Math.sign(next - index)) => {
    if (tabs.children[next]?.disabled) return;
    save();
    index = next;
    state.head = key(groups[next]);

    [...tabs.children].forEach((button, at) => {
      button.toggleAttribute("data-selected", at === index);
    });

    const button = tabs.children[index];
    const left = button.offsetLeft - tabs.offsetLeft;

    if (left < tabs.scrollLeft) tabs.scrollLeft = left;
    else if (left + button.offsetWidth > tabs.scrollLeft + tabs.clientWidth)
      tabs.scrollLeft = left + button.offsetWidth - tabs.clientWidth;
    render();
    animate([
      { transform: `translateX(${-direction * 24}px)`, opacity: 0.4 },
      { transform: "translateX(0)", opacity: 1 }
    ]);
  };

  const tab = (group) => {
    const button = dom.create("button");
    const at = groups.push(group) - 1;

    button.type = "button";
    button.disabled = false;
    if (group.type === "recent") {
      dom.set(button, "data-icon", "clock");
      dom.set(button, "data-recent", "all");
    } else {
      dom.set(button, "data-icon", group.icon || "smile");
    }
    dom.set(button, "data-tooltip", group.title);
    dom.on(button, "click", () => {
      if (at === index || gesture) return;
      select(at);
    });
    tabs.append(button);
  };

  const show = (packs = []) => {
    const current = groups[index];

    save();
    groups.length = 0;
    tabs.replaceChildren();
    [...basic, ...packs].forEach((group) => tab(group));
    index = Math.max(
      0,
      groups.findIndex((group) => key(group) === state.head)
    );
    state.head ||= key(groups[index]);
    tabs.children[0].disabled = !recent
      .recent()
      .some((item) => types.some(([type]) => type === item.type));
    if (index === 0 && tabs.children[0].disabled) {
      index = 1;
      state.head = key(groups[index]);
    }
    tabs.scrollLeft = state.tabs;
    [...tabs.children].forEach((button, at) =>
      button.toggleAttribute("data-selected", at === index)
    );
    if (
      !current ||
      key(current) !== key(groups[index]) ||
      !basic.includes(current)
    )
      render();
  };

  show();

  const adjacent = (step) => {
    const at = index + step;

    return at >= 0 && at < groups.length && !tabs.children[at].disabled
      ? at
      : -1;
  };

  return new Promise((resolve) => {
    closing = resolve;
    const element = root;
    const stuck = () => {
      head.toggleAttribute("data-stuck", grid.scrollTop > 0);
    };

    off.push(dom.on(grid, "scroll", stuck));
    stuck();

    for (const [direction, step] of [
      ["\u2190", 1],
      ["\u2192", -1]
    ]) {
      off.push(
        swipe(direction, {
          target: element,
          ignore: (event) => {
            const segment = event.target.closest(".segment");

            return Boolean(
              segment && segment.scrollWidth > segment.clientWidth + 1
            );
          },
          scroll: true,
          accept: () =>
            !gesture &&
            !element.hasAttribute("data-swipe") &&
            adjacent(step) !== -1,
          start: () => {
            gesture = { index: adjacent(step), step };
            dom.set(element, "data-swipe", "");
            animate(
              [
                { transform: "translateX(0)", opacity: 1 },
                { transform: `translateX(${-step * 40}px)`, opacity: 0.6 }
              ],
              true
            );
            animation.pause();
            animation.currentTime = 0;
          },
          move: (value) => {
            animation.currentTime = value * 1000;
          },
          end: (complete, value) => {
            const current = gesture;

            gesture = undefined;
            dom.remove(element, "data-swipe");
            if (complete) select(current.index, -current.step);
            else
              animate([
                {
                  transform: `translateX(${-step * 40 * value}px)`,
                  opacity: 1 - 0.4 * value
                },
                { transform: "translateX(0)", opacity: 1 }
              ]);
          }
        })
      );
    }
    const refresh = async (force = false) => {
      clearTimeout(retryTimer);
      const selected = state.head;
      const [catalog, response] = await Promise.all([
        emoji.load(force),
        api(`${route.emoji}/ogq`, {
          signal: AbortSignal.timeout(6500),
          cache: "no-store"
        })
      ]);

      if (closed) return;
      const packs = catalog.groups.map((group) => ({
        ...group,
        type: "emote"
      }));
      const data = response.data;

      if (response.ok && Array.isArray(data?.groups))
        packs.push(
          ...data.groups
            .filter(
              (group) =>
                typeof group?.title === "string" &&
                typeof group.icon === "string" &&
                Array.isArray(group.items) &&
                group.items.every((item) => attachment.ogq(item))
            )
            .map((group) => ({ ...group, type: "ogq" }))
        );
      const failed = catalog.unavailable || !response.ok;

      if (packs.length || !failed) show(packs);
      if (!failed) return;
      if (++attempts < 3) {
        retryTimer = setTimeout(() => {
          if (!closed) void refresh(true);
        }, attempts * 2000);
        return;
      }
      if (selected !== state.head) return;
      const notice = dom.create("p");

      notice.className = "chatting-emote-status";
      notice.textContent = i18n.message("chatting.emoji.failed");
      dom.set(notice, "data-i18n", "chatting.emoji.failed");
      if (!page?.offset && !fetching) {
        dom.set(grid, "data-empty", "");
        grid.replaceChildren(kinds, notice, footer);
      } else {
        grid.insertBefore(notice, footer);
      }
    };

    void refresh();
  }).finally(() => {
    const stick = atBottom(list);

    save();
    closed = true;
    clearTimeout(retryTimer);
    cancelAnimationFrame(frame);
    request?.abort();
    off.forEach((remove) => remove());
    root.remove();
    dom.remove(chat, "data-emotes");
    dom.set(form, "data-expanded", "false");
    dom.set(toggle, "data-icon", "plus");
    dom.set(toggle, "data-tooltip", "chatting.tools.open");
    form.dispatchEvent(new Event("chatting-state"));
    if (stick) list.scrollTop = list.scrollHeight;
    field.dispatchEvent(new Event("chatting-viewport", { bubbles: true }));
    animation?.cancel();
    loading.destroy();
  });
}
