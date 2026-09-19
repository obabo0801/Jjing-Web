import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as profile from "#common/profile";
import * as consent from "#shared/consent";
import * as login from "#common/login";
import portrait from "#common/profile/image";
import toast from "#common/toast";
import label from "#common/profile/label";
import dialog from "#common/dialog";

i18n.preload(
  "profile.own",
  "profile.delete",
  "profile.email",
  "profile.nameLimit",
  "setup.name",
  "setup.nameInvalid",
  "setup.nameUnavailable",
  "setup.saveError",
  "setup.uploadError",
  "image.save",
  "image.sizeError",
  "login.logout"
);

export default function editor(user) {
  const root = dom.create("section");
  const group = dom.create("div");
  const account = dom.create("div");
  const input = dom.create("input");

  let save = dom.create("button");

  let picture = portrait(user.avatar, user.image || user.avatar);
  let current = user;
  let active = true;
  let busy = false;

  root.className = "profile-section profile-own";
  group.className = "group";
  account.className = "group";
  input.value = user.name || "";
  input.maxLength = Math.max(20, input.value.length);
  input.autocomplete = "nickname";
  dom.set(input, "data-control", "");

  const field = label("setup.name", input.value);
  const value = dom.query(".label-value", field);
  const change = dom.create("button");

  change.type = "button";
  change.className = "label-value";
  change.textContent = input.value;
  dom.set(change, "data-response", "");
  value.replaceWith(change);
  dom.on(change, "click", async () => {
    const content = dom.create("div");

    content.className = "input";
    input.value = change.textContent;
    content.append(input);

    const accepted = await dialog({
      title: "setup.name",
      content,
      direction: "\u2192",
      actions: [
        { text: "profile.cancel", value: false },
        { text: "profile.confirm", submit: true, value: true }
      ]
    });

    if (accepted) change.textContent = input.value.trim();
    else input.value = change.textContent;

    update();
  });

  group.append(field, label("profile.email", user.email));
  for (const [key, icon, run] of [
    ["login.logout", "logout", login.logout],
    ["profile.delete", "trash", login.remove]
  ]) {
    const row = dom.create("div");
    const button = dom.create("button");
    const text = dom.create("span");

    row.className = "group-item";
    if (key === "profile.delete") {
      dom.set(row, "data-danger", "");
    }

    button.type = "button";
    dom.set(button, "data-icon", icon);

    if (key === "login.logout") {
      dom.set(button, "data-color", "");
    }

    dom.set(button, "data-response", "");

    text.textContent = i18n.message(key);
    dom.set(text, "data-i18n", key);

    dom.on(button, "click", run);

    button.append(text);
    row.append(button);
    account.append(row);
  }

  root.append(group, account);
  function update() {
    const changed = input.value.trim() !== current.name || picture.file() !== undefined;

    save.disabled = busy || !changed;
  }

  const submit = async () => {
    if (busy || save.disabled) return;
    const name = input.value.trim();

    if (name !== current.name && !/^[\p{L}\p{N} _-]{2,20}$/u.test(name)) {
      toast({ title: "setup.nameInvalid", type: "error" });

      return;
    }

    busy = true;
    input.disabled = true;
    picture.busy(true);
    dom.set(save, "data-icon", "throbber");
    update();
    try {
      const agreement = { terms: consent.terms, privacy: consent.privacy };
      const draft = await profile.save({ name, consent: agreement });

      if (!draft.ok) {
        toast({
          type: "error",
          title:
            draft.status === 429
              ? "profile.nameLimit"
              : draft.status === 409
                ? "setup.nameUnavailable"
                : "setup.saveError"
        });

        return;
      }

      if (!active) return;
      const file = picture.file();
      const upload = file ? await profile.uploadAvatar(file, draft.data.token) : { ok: true };

      if (!active) return;

      if (!upload.ok) {
        toast({
          type: "error",
          title: upload.status === 413 ? "image.sizeError" : "setup.uploadError"
        });

        return;
      }

      const result = await profile.complete(
        agreement,
        file === null ? "clear" : file ? "draft" : "keep",
        draft.data.token
      );

      if (!active) return;

      if (!result.ok) {
        toast({ type: "error", title: "setup.saveError" });

        return;
      }

      current = profile.value();

      const next = portrait(current.avatar, current.image || current.avatar);

      picture.root.replaceWith(next.root);
      picture.destroy();
      picture = next;
      input.value = current.name || "";
      change.textContent = input.value;
      dom.on(picture.root, "input", update);
    } catch {
      if (active) toast({ type: "error", title: "setup.saveError" });
    } finally {
      busy = false;
      if (active) {
        input.disabled = false;
        picture.busy(false);
        dom.set(save, "data-icon", "check");
        update();
      }
    }
  };

  dom.on(picture.root, "input", update);
  update();

  return {
    root,
    picture: picture.root,
    action: {
      head: true,
      icon: "check",
      text: "image.save",
      close: false,
      disabled: () => save.disabled,
      run: submit
    },
    ready: (element) => {
      save = dom.query(".layer-action", element);
      update();
    },
    destroy: () => {
      active = false;
      picture.destroy();
    }
  };
}
