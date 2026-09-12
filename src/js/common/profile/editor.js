import * as dom from "#common/dom";
import dialog from "#common/dialog";
import drawer from "#common/drawer";
import * as i18n from "#common/i18n";
import * as profile from "#common/profile";
import toast from "#common/toast";
import consent from "#common/profile/consent";
import portrait from "#common/profile/image";

const keys = [
  "setup.title",
  "setup.name",
  "setup.required",
  "setup.optional",
  "setup.namePlaceholder",
  "setup.nameChecking",
  "setup.nameAvailable",
  "setup.nameUnavailable",
  "setup.nameInvalid",
  "setup.nameCheckError",
  "setup.email",
  "setup.emailPlaceholder",
  "setup.emailAvailable",
  "setup.emailInvalid",
  "setup.next",
  "image.select",
  "image.title",
  "image.loadError",
  "image.camera",
  "image.gallery",
  "image.phone",
  "image.scan",
  "image.sizeError",
  "image.reset",
  "image.clear",
  "image.save",
  "setup.review",
  "setup.finish",
  "setup.revise",
  "setup.complete",
  "setup.saveError",
  "setup.uploadError"
];

i18n.preload(...keys);

const validName = (value) => /^[\p{L}\p{N} _-]{2,20}$/u.test(value);

const validEmail = (value) =>
  !value || (value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const text = (tag, name, key) => {
  const element = dom.create(tag);

  element.className = name;
  element.textContent = i18n.message(key) || key;
  dom.set(element, "data-i18n", key);

  return element;
};

const step = (current) => {
  const element = dom.create("small");

  element.className = "setup-step";
  element.textContent = `${current} / 2`;

  return element;
};

const field = (name, type = "text") => {
  const root = dom.create("div");
  const label = dom.create("label");
  const title = text("span", "label-key", `setup.${name}`);
  const required = text(
    "small",
    "setup-field-state",
    name === "name" ? "setup.required" : "setup.optional"
  );
  const control = dom.create("span");
  const input = dom.create("input");
  const status = dom.create("small");

  root.className = "setup-field";
  label.className = "label";
  control.className = "input";
  status.className = "setup-status";
  input.type = type;
  input.name = name;
  input.required = name === "name";
  input.autocomplete = name;
  input.enterKeyHint = name === "name" ? "next" : "done";

  if (name === "name") {
    input.minLength = 2;
    input.maxLength = 20;
  } else {
    input.maxLength = 254;
  }

  dom.set(input, "data-control", "");
  dom.set(input, "data-i18n-placeholder", `setup.${name}Placeholder`);
  const heading = dom.create("span");

  heading.className = "setup-field-title";

  heading.append(title, required);
  label.append(heading, control);
  control.append(input);
  root.append(label, status);

  return { root, input, status };
};

const state = (element, key, value) => {
  element.textContent = i18n.message(key) || key;
  dom.set(element, "data-state", value);
};

const finish = async (user, picture, agreement, close) => {
  const root = dom.create("div");
  const details = dom.create("div");
  const progress = step(2);
  const notice = text("p", "", "setup.finish");

  root.className = "setup-profile";
  details.className = "group";
  dom.set(root, "data-pan", "");

  for (const key of ["name", "email"]) {
    if (!user[key]) continue;

    const item = dom.create("div");
    const label = dom.create("div");
    const title = text("span", "label-key", `setup.${key}`);
    const value = dom.create("span");

    item.className = "group-item";
    label.className = "label";
    value.className = "label-value";
    value.textContent = user[key];
    label.append(title, value);
    item.append(label);
    details.append(item);
  }

  root.append(progress, notice, picture.preview(), details);

  let active = true;

  try {
    return await drawer({
      back: true,
      title: "setup.review",
      content: root,
      side: "right",
      direction: "→",
      closing: () => {
        active = false;
      },
      actions: [
        {
          text: "setup.revise",
          icon: "close",
          value: false,
          data: ["data-neutral"]
        },
        {
          text: "setup.complete",
          icon: "check",
          data: ["data-confirm"],
          close: false,
          run: async ({ button, close: end }) => {
            button.disabled = true;
            picture.busy(true);
            dom.set(button, "data-icon", "throbber");

            const file = picture.file();
            const uploaded = file
              ? await profile.uploadAvatar(file)
              : { ok: true };

            if (!active) return false;

            const saved = uploaded.ok
              ? await profile.complete(
                  agreement.value(),
                  file === null ? null : file ? "draft" : "keep"
                )
              : uploaded;

            if (!active) return false;

            if (saved.ok) {
              await close(true);
              await end(true);
              return false;
            }

            toast({
              type: "error",
              title:
                saved.status === 412
                  ? "setup.consent.error"
                  : uploaded.status === 413
                    ? "image.sizeError"
                    : uploaded.ok
                      ? "setup.saveError"
                      : "setup.uploadError"
            });
            button.disabled = false;
            picture.busy(false);
            dom.set(button, "data-icon", "check");

            return false;
          }
        }
      ]
    });
  } finally {
    active = false;
    picture.busy(false);
  }
};

export default async function editor(user, ready) {
  const form = dom.create("div");
  const progress = step(1);
  const picture = portrait(user.avatar, user.image || user.avatar);
  const name = field("name");
  const email = field("email", "email");
  const agreement = consent();

  form.className = "setup-form";
  form.append(progress, picture.root, name.root, email.root, agreement.root);
  name.input.value = user.name || "";
  email.input.value = user.email || "";

  let available = false;
  let timer;
  let version = 0;
  let active = true;

  const refresh = () =>
    form.dispatchEvent(new Event("input", { bubbles: true }));

  dom.on(name.input, "input", () => {
    clearTimeout(timer);
    available = false;

    const value = name.input.value.trim();
    const rev = ++version;

    if (!validName(value)) {
      state(name.status, "setup.nameInvalid", "error");
      return;
    }

    state(name.status, "setup.nameChecking", "mute");
    timer = setTimeout(async () => {
      const result = await profile
        .checkName(value)
        .catch(() => ({ ok: false }));

      if (rev !== version) {
        return;
      }

      if (!result.ok) {
        state(name.status, "setup.nameCheckError", "error");
        refresh();
        return;
      }

      available = result.data?.available === true;

      state(
        name.status,
        available ? "setup.nameAvailable" : "setup.nameUnavailable",
        available ? "success" : "error"
      );
      refresh();
    }, 300);
  });

  dom.on(email.input, "input", () => {
    const value = email.input.value.trim();
    const valid = validEmail(value);

    if (!value) {
      email.status.textContent = "";
      dom.remove(email.status, "data-state");
      return;
    }

    state(
      email.status,
      valid ? "setup.emailAvailable" : "setup.emailInvalid",
      valid ? "success" : "error"
    );
  });

  try {
    return await dialog({
      title: "setup.title",
      content: form,
      direction: "→",
      locked: true,
      ready: (element) => {
        element.tabIndex = -1;
        element.focus({ preventScroll: true });
        ready?.();

        if (name.input.value) {
          name.input.dispatchEvent(new Event("input", { bubbles: true }));
        }

        if (email.input.value) {
          email.input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
      actions: [
        {
          text: "setup.next",
          submit: true,
          icon: "arrow",
          data: ["data-confirm"],
          close: false,
          disabled: () =>
            !validName(name.input.value.trim()) ||
            !available ||
            !validEmail(email.input.value.trim()) ||
            !agreement.valid(),
          run: async ({ close }) => {
            if (
              !available ||
              !validName(name.input.value.trim()) ||
              !validEmail(email.input.value.trim()) ||
              !agreement.valid()
            ) {
              return false;
            }

            const saved = await profile.save({
              name: name.input.value.trim(),
              email: email.input.value.trim(),
              consent: agreement.value()
            });

            if (!active) return false;

            if (!saved.ok) {
              if (saved.status === 409) {
                available = false;
                state(name.status, "setup.nameUnavailable", "error");
                refresh();
              } else {
                toast({
                  type: "error",
                  title:
                    saved.status === 412
                      ? "setup.consent.error"
                      : "setup.saveError"
                });
              }

              return false;
            }

            await finish(saved.data, picture, agreement, close);

            return false;
          }
        }
      ]
    });
  } finally {
    active = false;
    version += 1;
    clearTimeout(timer);
    picture.destroy();
  }
}
