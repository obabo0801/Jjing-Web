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
  "sent",
  "confirm",
  "operations",
  "data",
  "files",
  "upload",
  "tts",
  "stt",
  "service",
  "log",
  "evidence",
  "filename",
  "size",
  "time",
  "text",
  "preview",
  "folder",
  "table",
  "fields"
];

i18n.preload(
  ...keys.map((key) => `admin.${key}`),
  "report.inbox",
  "dialog.cancel",
  "dialog.confirm"
);

const node = (tag, className = "", key = "") => {
  const element = dom.create(tag);

  element.className = className;

  if (key) {
    element.textContent = i18n.message(key);
    dom.set(element, "data-i18n", key);
  }

  if (tag === "button") {
    dom.set(element, "data-response", "");
  }

  return element;
};

const fail = () => toast({ text: "admin.error", type: "error" });
const group = (...rows) => {
  const root = node("div", "group");

  for (const row of rows.filter(Boolean)) {
    if (row.classList.contains("group-item")) root.append(row);
    else {
      const item = node("div", "group-item");

      item.append(row);
      root.append(item);
    }
  }

  return root;
};

const entry = (key, icon, run) => {
  const row = node("div", "group-item");
  const button = node("button");

  button.type = "button";
  dom.set(button, "data-icon", icon);
  dom.set(button, "data-color", "");
  button.append(node("span", "group-name", key));
  dom.on(button, "click", run);
  row.append(button);

  return row;
};

const open = (title, content, options = {}) =>
  drawer({ title, content, back: true, side: "right", direction: "→", ...options });

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
  const root = node("div", "profile admin");
  const fields = Object.fromEntries(
    ["title", "body", "image", "url"].map((key) => [
      key,
      field(`admin.${key}`, key === "body" ? "textarea" : key === "image" ? "file" : "text")
    ])
  );

  fields.title.input.required = true;
  fields.title.input.maxLength = 100;
  fields.body.input.maxLength = 500;
  fields.url.input.value = "/";
  fields.image.input.accept = "image/png,image/jpeg,image/webp";
  root.append(
    group(fields.title.root, fields.body.root),
    group(fields.image.root, fields.url.root)
  );

  return open("admin.heading", root, {
    actions: [
      {
        text: "admin.send",
        icon: "send",
        submit: true,
        close: false,
        run: async ({ button }) => {
          if (
            !(await dialog({
              title: "admin.heading",
              content: "admin.confirm",
              direction: "→",
              actions: [
                { text: "dialog.cancel", icon: "close", value: false },
                { text: "dialog.confirm", icon: "check", value: true }
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

async function browse(table = "", scope = {}) {
  const root = node("div", "profile online admin");
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
  for (const [button, key] of [
    [previousButton, "admin.previous"],
    [nextButton, "admin.next"]
  ]) {
    dom.set(button, "data-circle", "");
    dom.set(button, "data-tooltip", key);
  }
  previousButton.disabled = nextButton.disabled = true;

  const filter = node("select");
  const match = field("admin.filter");
  const choice = node("div");
  const loading = progress({ type: "circular", value: 25, show: false });

  choice.hidden = true;
  choice.append(filter);
  if (table) root.append(label("admin.table", table));

  root.append(search.root);
  if (table) {
    const selection = node("label", "label");

    selection.append(node("span", "label-key", "admin.fields"), choice);
    root.append(node("p", "", "admin.readonly"), group(selection, match.root));
  }

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

    const params = new URLSearchParams({ ...scope, q: search.input.value, page: String(index) });

    if (table && filter.value) {
      params.set("field", filter.value);
      params.set("value", match.input.value);
    }

    const response = await api(`${path}/${table ? `database/${table}` : "users"}?${params}`, {
      signal: request.signal
    });

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
      choice.classList.add("select");
      choice.hidden = false;
    }

    if (!data.items.length) rows.append(node("p", "online-empty", "admin.empty"));
    else if (table) {
      rows.append(
        group(
          ...data.items.map((item, index) => {
            const row = entry("", "storage", () => details(item, data.columns));
            const name = dom.query(".group-name", row);
            const summary = node("span", "admin-summary");
            const key = data.columns.find((key) => item[key] !== null && item[key] !== "");

            name.textContent = String(item[key] ?? index + 1);
            summary.textContent = data.columns
              .filter((column) => column !== key && item[column] != null && item[column] !== "")
              .slice(0, 2)
              .map((column) => String(item[column]))
              .join("\n");

            dom.query("button", row).append(summary);
            row.classList.add("admin-record");
            return row;
          })
        )
      );
    } else {
      const list = group(
        ...data.items.map((user) => {
          const row = entry("", "", () =>
            profile(dom.query("button", row), root, { id: user.id, context: "chatting" })
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
    return await open(table ? "admin.database" : "admin.users", root, { ready: load });
  } finally {
    closed = true;
    request?.abort();
    clearTimeout(timer);
    loading.destroy();
  }
}

function details(item, columns) {
  const content = group(
    ...columns.map((key) => {
      const row = label("admin.details", item[key] === "" || item[key] == null ? "—" : item[key]);
      const caption = dom.query(".label-key", row);

      dom.remove(caption, "data-i18n");
      caption.textContent = key;
      return row;
    })
  );

  content.classList.add("admin");
  return open("admin.details", content);
}

const section = (key, ...rows) => {
  const root = node("section", "group-section");

  root.append(node("h3", "group-title", key), group(...rows));
  return root;
};

async function database(scope = {}) {
  const response = await api(`${path}/database?${new URLSearchParams(scope)}`);

  if (!response.ok) return fail();
  const root = node("div", "profile admin");

  root.append(node("p", "", "admin.readonly"));
  if (!response.data.length) root.append(node("p", "online-empty", "admin.empty"));

  root.append(
    group(
      ...response.data.map((item) => {
        const row = entry(item.key || "", "storage", () =>
          item.table ? browse(item.table, scope) : database(item.scope)
        );

        if (!item.key) dom.query(".group-name", row).textContent = item.name || item.table;
        return row;
      })
    )
  );

  return open("admin.database", root);
}

async function preview(kind, item) {
  const root = node("div", "profile admin");
  const media = node(item.type === "image" ? "img" : "audio", "admin-preview");

  if (item.type === "image") media.alt = item.name;
  else {
    media.controls = true;
    media.preload = "none";
  }

  media.src = `/api${path}/files/${kind}/content?${new URLSearchParams({ file: item.file })}`;

  const error = node("p", "", "admin.error");

  error.hidden = true;
  dom.on(media, "error", () => {
    error.hidden = false;
  });

  root.append(
    media,
    error,
    group(
      label("admin.filename", item.file),
      label("admin.size", `${item.size.toLocaleString()} B`),
      label("admin.time", item.time, { date: true }),
      label("admin.text", item.text)
    )
  );

  try {
    return await open("admin.preview", root);
  } finally {
    if (item.type === "audio") media.pause();

    media.removeAttribute("src");
    if (item.type === "audio") media.load();
  }
}

async function files(kind, folder = "") {
  const root = node("div", "profile admin");
  const search = field("admin.search", "search");
  const rows = node("div");
  const controls = node("nav", "admin-pages");
  const page = node("output");
  const loading = progress({ type: "circular", value: 25, show: false });

  let index = 0;
  let revision = 0;
  let request;
  let timer;
  let closed = false;

  const previous = dom.query(
    "button",
    entry("admin.previous", "arrow", () => {
      index--;
      void load();
    })
  );

  const next = dom.query(
    "button",
    entry("admin.next", "arrow", () => {
      index++;
      void load();
    })
  );

  dom.set(previous, "data-angle", "left");
  for (const [button, key] of [
    [previous, "admin.previous"],
    [next, "admin.next"]
  ]) {
    dom.set(button, "data-circle", "");
    dom.set(button, "data-tooltip", key);
    button.disabled = true;
  }
  controls.append(previous, page, next);
  if (folder) root.append(label("admin.folder", folder));

  root.append(search.root, loading.element, rows, controls);

  async function load() {
    const version = ++revision;

    request?.abort();
    request = new AbortController();
    previous.disabled = next.disabled = true;
    loading.element.hidden = false;

    const params = new URLSearchParams({ folder, q: search.input.value, page: String(index) });
    const response = await api(`${path}/files/${kind}?${params}`, { signal: request.signal });

    if (closed || version !== revision) return;

    loading.element.hidden = true;
    rows.replaceChildren();
    if (!response.ok) return fail();
    const data = response.data;

    previous.disabled = index === 0;
    next.disabled = (index + 1) * 30 >= data.total;
    page.textContent = `${index + 1} / ${Math.max(1, Math.ceil(data.total / 30))}`;
    if (!data.items.length) rows.append(node("p", "online-empty", "admin.empty"));
    else
      rows.append(
        group(
          ...data.items.map((item) => {
            const row = entry(
              "",
              item.type === "image" ? "image" : item.type === "audio" ? "voice" : "storage",
              () => (item.type === "folder" ? files(kind, item.file) : preview(kind, item))
            );
            const title = dom.query(".group-name", row);
            const summary = node("span", "admin-summary");

            title.textContent = item.name;
            summary.textContent =
              item.text || (item.type === "folder" ? "" : `${item.size.toLocaleString()} B`);

            dom.query("button", row).append(summary);
            row.classList.add("admin-record");
            return row;
          })
        )
      );

    mount(root);
  }

  dom.on(search.input, "input", () => {
    index = 0;
    revision++;
    request?.abort();
    clearTimeout(timer);
    timer = setTimeout(load, 200);
  });

  try {
    return await open(`admin.${kind}`, root, { ready: load });
  } finally {
    closed = true;
    request?.abort();
    clearTimeout(timer);
    loading.destroy();
  }
}

export default function admin(anchor) {
  return opening("admin", async () => {
    const response = await api(path);

    if (!response.ok) return fail();
    const content = node("div", "profile admin");

    content.classList.add("admin");
    content.append(
      section(
        "admin.operations",
        entry("admin.heading", "notify-ring", notify),
        entry("admin.users", "search", () => browse())
      ),
      section(
        "report.inbox",
        entry("report.inbox", "flag", () => reports())
      )
    );

    if (response.data.database)
      content.append(
        section(
          "admin.data",
          entry("admin.database", "storage", () => database())
        ),
        section(
          "admin.files",
          entry("admin.upload", "image", () => files("upload")),
          entry("admin.tts", "voice", () => files("tts")),
          entry("admin.stt", "voice", () => files("stt"))
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
