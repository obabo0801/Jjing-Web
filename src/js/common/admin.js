import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as navigation from "#common/route";
import * as names from "#common/profile/name";
import { admin as path } from "#shared/route";
import api from "#common/api";
import upload from "#common/upload";
import popover from "#common/popover";
import drawer from "#common/drawer";
import dialog from "#common/dialog";
import toast from "#common/toast";
import progress from "#common/progress";
import mount from "#common/mount";
import once from "#common/once";
import avatar from "#common/avatar";
import profile from "#common/profile/view";
import reports from "#common/report/inbox";
import label from "#common/profile/label";
import "../../css/common/admin.css";

const opening = once();
const keys = [
  "panel",
  "heading",
  "title",
  "body",
  "image",
  "url",
  "send",
  "users",
  "status",
  "database",
  "readonly",
  "search",
  "filter",
  "all",
  "previous",
  "next",
  "details",
  "empty",
  "error",
  "server",
  "uptime",
  "push",
  "fcm",
  "ready",
  "unavailable",
  "configured",
  "disabled",
  "sent",
  "confirm",
  "refresh"
];

i18n.preload(
  ...keys.map((key) => `admin.${key}`),
  "report.inbox",
  "dialog.cancel",
  "dialog.confirm"
);

const node = (tag, className = "", key = "") => {
  const element = dom.create(tag);

  if (tag === "button") dom.set(element, "data-response", "");
  element.className = className;
  if (key) {
    element.textContent = i18n.message(key);
    dom.set(element, "data-i18n", key);
  }
  return element;
};
const fail = () => toast({ text: "admin.error", type: "error" });
const group = (...rows) => {
  const root = node("div", "group");

  root.append(...rows.filter(Boolean));
  return root;
};

const entry = (key, icon, run) => {
  const row = node("div", "group-item");
  const button = node("button");

  button.type = "button";
  dom.set(button, "data-icon", icon);
  button.append(node("span", "group-name", key));
  dom.on(button, "click", run);
  row.append(button);
  return row;
};

const open = (title, content, options = {}) =>
  drawer({
    title,
    content,
    back: true,
    side: "right",
    direction: "→",
    ...options
  });

const field = (key, type = "text") => {
  const root = node("label", "label");
  const control = node("div", "input");
  const input = node(type === "textarea" ? "textarea" : "input");

  if (type !== "textarea") input.type = type;
  dom.set(input, "data-control", "");
  control.append(input);
  root.append(node("span", "label-key", key), control);
  return { root, input };
};

async function notify() {
  const root = node("div", "profile");
  const fields = Object.fromEntries(
    ["title", "body", "image", "url"].map((key) => [
      key,
      field(
        `admin.${key}`,
        key === "body" ? "textarea" : key === "image" ? "file" : "text"
      )
    ])
  );

  fields.title.input.required = true;
  fields.title.input.maxLength = 100;
  fields.body.input.maxLength = 500;
  fields.url.input.value = "/";
  fields.image.input.accept = "image/png,image/jpeg,image/webp";
  root.append(...Object.values(fields).map((item) => item.root));
  return open("admin.heading", root, {
    actions: [
      {
        text: "admin.send",
        submit: true,
        close: false,
        run: async ({ button }) => {
          if (
            !(await dialog({
              title: "admin.confirm",
              direction: "→",
              actions: [
                { text: "dialog.cancel", value: false },
                { text: "dialog.confirm", value: true }
              ]
            }))
          )
            return;
          button.disabled = true;
          const loading = progress({ type: "circular", value: 25 });

          root.append(loading.element);
          try {
            let image = "";

            const file = fields.image.input.files[0];

            if (file) {
              const result = await upload(`${path}/image`, file);

              if (!result.ok) return fail();
              image = result.data.image;
            }
            const result = await api(path, {
              method: "POST",
              data: {
                title: fields.title.input.value,
                body: fields.body.input.value,
                url: fields.url.input.value,
                image
              }
            });

            if (!result.ok) return fail();
            toast({
              type: result.data.failed ? "info" : "success",
              text: i18n
                .message("admin.sent")
                .replace("{sent}", result.data.sent)
                .replace("{failed}", result.data.failed)
            });
            fields.image.input.value = "";
          } finally {
            loading.destroy();
            button.disabled = false;
          }
        }
      }
    ]
  });
}

async function browse(table = "") {
  const root = node("div", "profile online");
  const search = field("admin.search", "search");
  const rows = node("div");
  const controls = node("nav", "admin-pages");
  const page = node("output");

  let index = 0;

  const previous = entry("admin.previous", "arrow", () => {
    index--;
    void load();
  });

  const next = entry("admin.next", "arrow", () => {
    index++;
    void load();
  });
  const previousButton = dom.query("button", previous);
  const nextButton = dom.query("button", next);

  dom.set(previousButton, "data-angle", "left");
  nextButton.classList.add("icon-right");
  previousButton.disabled = nextButton.disabled = true;
  const filter = node("select");
  const match = field("admin.filter");
  const choice = node("div", "select");
  const loading = progress({ type: "circular", value: 25, show: false });

  choice.append(filter);
  root.append(search.root);
  if (table) root.append(node("p", "", "admin.readonly"), choice, match.root);
  controls.append(previousButton, page, nextButton);
  root.append(loading.element, rows, controls);
  let revision = 0;
  let closed = false;
  let request;
  let timer;

  async function load() {
    const version = ++revision;

    request?.abort();
    request = new AbortController();
    loading.element.hidden = false;
    previousButton.disabled = nextButton.disabled = true;
    const params = new URLSearchParams({
      q: search.input.value,
      page: String(index)
    });

    if (table && filter.value) {
      params.set("field", filter.value);
      params.set("value", match.input.value);
    }
    const response = await api(
      `${path}/${table ? `database/${table}` : "users"}?${params}`,
      { signal: request.signal }
    );

    if (closed || version !== revision) return;
    loading.element.hidden = true;
    rows.replaceChildren();
    if (!response.ok) return fail();
    const data = response.data;

    previousButton.disabled = index === 0;
    nextButton.disabled = (index + 1) * 30 >= data.total;
    page.textContent = `${index + 1} / ${Math.max(1, Math.ceil(data.total / 30))}`;
    if (table && !filter.children.length) {
      const all = node("option", "", "admin.all");

      all.value = "";
      filter.append(all);
      for (const key of data.columns) {
        const option = node("option");

        option.value = option.textContent = key;
        filter.append(option);
      }
    }
    if (!data.items.length)
      rows.append(node("p", "online-empty", "admin.empty"));
    else if (table) {
      const wrap = node("div", "table-wrap");
      const grid = node("table", "admin-table");
      const head = node("thead");
      const tr = node("tr");
      const body = node("tbody");

      for (const key of ["", ...data.columns]) {
        const th = node("th");

        th.textContent = key || i18n.message("admin.details");
        tr.append(th);
      }
      head.append(tr);
      for (const item of data.items) {
        const row = node("tr");
        const cell = node("td");
        const button = node("button", "", "admin.details");

        button.type = "button";
        dom.on(button, "click", () => {
          const details = group(
            ...data.columns.map((key) => {
              const element = label("admin.details", item[key]);

              if (element) {
                const caption = dom.query(".label-key", element);

                dom.remove(caption, "data-i18n");
                caption.textContent = key;
              }
              return element;
            })
          );

          void open("admin.details", details);
        });
        cell.append(button);
        row.append(cell);
        for (const key of data.columns) {
          const td = node("td");

          td.textContent = String(item[key] ?? "").slice(0, 160);
          row.append(td);
        }
        body.append(row);
      }
      grid.append(head, body);
      wrap.append(grid);
      rows.append(wrap);
    } else {
      const list = group(
        ...data.items.map((user) => {
          const row = entry("", "", () =>
            profile(dom.query("button", row), root, {
              id: user.id,
              context: "chatting"
            })
          );
          const button = dom.query("button", row);
          const picture = node("span", "avatar-wrap");
          const name = node("span", "online-name");

          dom.remove(button, "data-icon");
          picture.append(avatar(user.avatar, "span").root);
          name.textContent = names.label(user);
          names.mark(name, user.verified);
          button.replaceChildren(picture, name);
          return row;
        })
      );

      rows.append(list);
    }
    mount(root);
  }
  const refresh = () => {
    index = 0;
    revision++;
    request?.abort();
    clearTimeout(timer);
    timer = setTimeout(load, 200);
  };

  dom.on(search.input, "input", refresh);
  dom.on(match.input, "input", refresh);
  dom.on(filter, "change", refresh);
  try {
    return await open(table ? "admin.database" : "admin.users", root, {
      ready: load
    });
  } finally {
    closed = true;
    request?.abort();
    clearTimeout(timer);
    loading.destroy();
  }
}

async function database() {
  const response = await api(`${path}/database`);

  if (!response.ok) return fail();
  const root = node("div", "profile");

  root.append(node("p", "", "admin.readonly"));
  root.append(
    group(
      ...response.data.map((table) => {
        const row = entry("", "storage", () => browse(table));

        dom.query(".group-name", row).textContent = table;
        return row;
      })
    )
  );
  return open("admin.database", root);
}

async function status() {
  const root = node("div", "profile");
  const load = async () => {
    const response = await api(`${path}/status`);

    if (!response.ok) return fail();
    const data = response.data;

    root.replaceChildren(
      group(
        ...["server", "database", "push", "fcm"].map((key) =>
          label(
            `admin.${key}`,
            i18n.message(
              `admin.${
                ["push", "fcm"].includes(key)
                  ? data[key]
                    ? "configured"
                    : "disabled"
                  : data[key]
                    ? "ready"
                    : "unavailable"
              }`
            )
          )
        ),
        label(
          "admin.uptime",
          `${Math.floor(data.uptime / 3600)}:${String(Math.floor(data.uptime / 60) % 60).padStart(2, "0")}:${String(data.uptime % 60).padStart(2, "0")}`
        )
      )
    );
    mount(root);
  };

  return open("admin.status", root, {
    ready: load,
    actions: [{ text: "admin.refresh", close: false, run: load }]
  });
}

export default function admin(anchor) {
  return opening("admin", async () => {
    const response = await api(path);

    if (!response.ok) return fail();
    const content = node("div", "profile");

    content.append(
      group(
        entry("admin.heading", "notify-ring", notify),
        entry("report.inbox", "flag", () => reports()),
        entry("admin.users", "search", () => browse()),
        entry("admin.status", "info", status),
        response.data.database
          ? entry("admin.database", "storage", database)
          : null
      )
    );
    return popover({
      title: "admin.panel",
      content,
      anchor,
      fullscreen: true,
      back: true,
      direction: "→",
      route: ["admin", ""]
    });
  });
}

navigation.register("admin", () => admin(), "popover");
