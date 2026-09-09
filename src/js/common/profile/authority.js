import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as profile from "#common/profile";
import * as toggle from "#common/toggle";
import label from "#common/profile/label";
import mount from "#common/mount";

const group = (...items) => {
  const root = dom.create("div");

  root.className = "group";
  root.append(...items.filter(Boolean));
  return root;
};

export default function authority(user) {
  const row = dom.create("div");
  const root = dom.create("div");
  const head = dom.create("div");
  const button = dom.create("button");
  const title = dom.create("span");
  const field = dom.create("div");
  const name = dom.create("label");
  const input = dom.create("input");
  const content = dom.create("fieldset");
  const status = dom.create("span");
  const info = group();

  row.className = "group-item";
  root.className = "toggle";
  head.className = "toggle-head";
  button.className = "toggle-button";
  button.type = "button";
  dom.set(button, "data-icon", "setting");
  dom.set(button, "data-response", "");
  title.textContent = i18n.message("profile.authority");
  dom.set(title, "data-i18n", "profile.authority");
  field.className = "switch toggle-switch";
  input.type = "checkbox";
  input.checked = !user.blocked && user.authority.enabled;
  input.name = "authority";
  name.append(input);
  button.append(title);
  field.append(name);
  head.append(button, field);
  content.className = "toggle-content";
  status.className = "profile-error";
  status.hidden = true;
  status.textContent = i18n.message("profile.saveError");
  dom.set(status, "data-i18n", "profile.saveError");
  content.append(info, status);
  root.append(head, content);
  row.append(root);

  let busy = false;

  const sync = () => {
    input.disabled = busy || Boolean(user.blocked) || !user.authority;
    button.disabled = input.disabled;
    toggle.sync(root);
  };

  const save = async (data) => {
    if (busy || user.blocked || !user.authority) return false;
    busy = true;
    sync();
    status.hidden = true;
    try {
      const result = await profile.authority(user.uid, data);

      if (!result.ok) {
        status.hidden = false;
        return false;
      }
      const fresh = await profile.read(user.uid, { fresh: true });

      if (!fresh.ok || !fresh.data.authority) {
        status.hidden = false;
        return false;
      }
      Object.assign(user, fresh.data);
      render();
      return true;
    } finally {
      busy = false;
      sync();
    }
  };

  function render() {
    const authority = user.authority;
    const memo = label(
      "profile.memo",
      authority.memo || i18n.message("profile.none") || "-"
    );
    const edit = dom.create("button");
    const details = dom.query(".label-content", memo);
    const value = dom.query(".label-value", memo);

    input.checked = !user.blocked && authority.enabled;
    edit.type = "button";
    edit.className = "label-memo";
    dom.set(edit, "data-icon", "edit");
    dom.set(edit, "data-tooltip", "profile.editMemo");
    details.append(edit);
    dom.on(edit, "click", () => {
      if (busy || dom.query("input", details)) return;
      const field = dom.create("form");
      const wrapper = dom.create("div");
      const input = dom.create("input");
      const confirm = dom.create("button");

      wrapper.className = "input";
      field.className = "profile-memo";
      input.value = authority.memo || "";
      input.maxLength = 500;
      input.name = "memo";
      dom.set(input, "data-control", "");
      dom.set(input, "data-i18n-placeholder", "profile.memo");
      confirm.type = "submit";
      confirm.className = "label-memo";
      dom.set(confirm, "data-icon", "check");
      dom.set(confirm, "data-tooltip", "profile.confirm");
      wrapper.append(input);
      field.append(wrapper, confirm);
      value.hidden = true;
      edit.hidden = true;
      details.append(field);
      mount(field);
      input.focus({ preventScroll: true });
      dom.on(field, "submit", async (event) => {
        event.preventDefault();
        confirm.disabled = true;
        await save({ memo: input.value.trim() });
        confirm.disabled = false;
      });
    });
    const activity = authority.activity;
    const summary = activity
      ? (i18n.message("profile.counts") || "")
          .replace("{mute}", activity.mute)
          .replace("{kick}", activity.kick)
      : i18n.message("profile.none") || "-";

    info.replaceChildren(
      ...[
        memo,
        label("profile.granted", authority.time, { date: true }),
        label("profile.handler", authority.handler || authority.actor),
        label("profile.activity", summary)
      ].filter(Boolean)
    );
    mount(root);
    sync();
    i18n.translate();
  }

  render();
  dom.on(input, "input", async () => {
    const enabled = input.checked;

    if (!(await save({ enabled })))
      input.checked = !user.blocked && Boolean(user.authority?.enabled);
    sync();
  });

  return row;
}
