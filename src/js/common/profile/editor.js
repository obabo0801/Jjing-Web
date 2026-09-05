import * as dom from "#common/dom";
import limit from "#config/upload";
import dialog from "#common/dialog";
import drawer from "#common/drawer";
import edit from "#common/image";
import { message, preload } from "#common/i18n";
import * as profile from "#common/profile";
import avatar from "#common/avatar";
import sheet from "#common/sheet";
import toast from "#common/toast";
import once from "#common/once";

const keys = [
  "setup.title",
  "setup.name",
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
  "image.save",
  "setup.greeting",
  "setup.welcome",
  "setup.optional",
  "setup.complete",
  "setup.saveError",
  "setup.uploadError"
];

preload(...keys);

const validName = (value) =>
  /^[\p{L}\p{N} _-]{2,20}$/u.test(value);

const validEmail = (value) =>
  !value ||
  (value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const text = (tag, name, key) => {
  const element = dom.create(tag);

  element.className = name;
  element.textContent = message(key) || key;
  dom.set(element, "data-i18n", key);

  return element;
};

const format = (key, values) =>
  Object.entries(values).reduce(
    (value, [name, content]) =>
      value.replaceAll(`{${name}}`, content),
    message(key) || key
  );

const field = (name, type = "text") => {
  const root = dom.create("div");
  const label = dom.create("label");
  const title = text("span", "label-key", `setup.${name}`);
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

  if (name === "name") {
    input.minLength = 2;
    input.maxLength = 20;
  } else {
    input.maxLength = 254;
  }

  dom.set(input, "data-control", "");
  dom.set(
    input,
    "data-i18n-placeholder",
    `setup.${name}Placeholder`
  );
  label.append(title, control);
  control.append(input);
  root.append(label, status);

  return { root, input, status };
};

const state = (element, key, value) => {
  element.textContent = message(key) || key;
  dom.set(element, "data-state", value);
};

const portrait = (source, original = source) => {
  const root = dom.create("div");
  const media = avatar(source, "button");
  const mark = dom.create("span");

  root.className = "profile-avatar";
  mark.className = "profile-edit";

  dom.set(media.root, "data-response", "");
  dom.set(media.root, "data-tooltip", "image.select");
  dom.set(mark, "data-icon", "edit");

  media.root.append(mark);
  root.append(media.root);

  let pending;
  let url;

  const adjust = async (file, anchor, previous) => {
    try {
      return await edit(file, {
        anchor,
        edit: previous,
        shape: "circle",
        width: 512,
        height: 512
      });
    } catch {
      return null;
    }
  };

  const select = async () => {
    const panel = dom.create("div");
    const stage = avatar("", "button");
    const options = dom.create("div");
    const revise = once();

    stage.root.tabIndex = -1;
    dom.set(stage.root, "data-response", "");
    dom.set(stage.root, "data-tooltip", "image.title");

    panel.className = "image-select";
    options.className = "group";
    dom.set(options, "data-view", "grid");

    let draft = pending;
    let draftUrl = url;
    let temporary = false;
    let version = 0;
    let adjusting = false;

    const show = () => {
      version += 1;
      stage.set(draftUrl || source, draft?.edit);
      stage.root.disabled =
        adjusting || !(draftUrl || source);
    };

    const update = (result) => {
      if (temporary && draftUrl) {
        URL.revokeObjectURL(draftUrl);
      }

      draft = result;
      draftUrl = URL.createObjectURL(result.file);
      temporary = true;
      show();
    };

    dom.on(stage.root, "click", () => {
      revise(stage.root, async () => {
        if (stage.root.disabled) {
          return;
        }

        const current = version;
        const previous = draft?.edit;

        let file = draft?.file;

        adjusting = true;
        stage.root.disabled = true;

        try {
          if (!file) {
            const response = await fetch(
              draftUrl || original
            );

            if (!response.ok) {
              throw new Error("image.loadError");
            }

            file = await response.blob();
          }

          if (current !== version || !panel.isConnected) {
            return;
          }

          if (file.size > limit) {
            toast({
              type: "error",
              title: "image.sizeError"
            });
            return;
          }

          const result = await adjust(
            file,
            stage.root,
            previous
          );

          if (
            result &&
            current === version &&
            panel.isConnected
          ) {
            update(result);
          }
        } catch {
          if (current === version && panel.isConnected) {
            toast({
              type: "error",
              title: "image.loadError"
            });
          }
        } finally {
          adjusting = false;
          stage.root.disabled = !(draftUrl || source);
        }
      }).catch(() => {});
    });

    const offLink = profile.onLink((token) => {
      if (temporary && draftUrl) {
        URL.revokeObjectURL(draftUrl);
      }

      draft = undefined;
      draftUrl = profile.linkImage(token);
      temporary = false;
      show();
    });

    const choose = (icon, key, capture = false) => {
      const button = dom.create("button");
      const input = dom.create("input");

      button.type = "button";
      input.type = "file";
      input.accept =
        "image/jpeg,image/png,image/webp,image/gif";
      input.hidden = true;

      dom.set(button, "data-icon", `${icon} center`);
      dom.set(button, "data-circle", "");
      dom.set(button, "data-background", "");
      dom.set(button, "data-response", "");
      dom.set(button, "data-tooltip", key);

      if (capture) {
        dom.set(input, "capture", "environment");
      }

      dom.on(button, "click", () => input.click());

      dom.on(input, "change", async () => {
        const file = input.files?.[0];

        input.value = "";

        if (!file) {
          return;
        }

        if (file.size > limit) {
          toast({
            type: "error",
            title: "image.sizeError"
          });
          return;
        }

        const result = await adjust(file, button);

        if (!result) {
          return;
        }

        update(result);
      });

      return { button, input };
    };

    const phone = () => {
      const button = dom.create("button");

      button.type = "button";
      dom.set(button, "data-icon", "phone center");
      dom.set(button, "data-circle", "");
      dom.set(button, "data-background", "");
      dom.set(button, "data-response", "");
      dom.set(button, "data-tooltip", "image.phone");

      dom.on(button, "click", async () => {
        const result = await profile.imageLink();

        if (!result.ok) {
          return;
        }

        const url = new URL("/image", location.origin);

        url.searchParams.set("token", result.data.token);

        const { default: QRCode } = await import("qrcode");

        const content = dom.create("div");
        const code = dom.create("img");
        const guide = dom.create("p");

        content.className = "image-phone";
        code.className = "image-phone-code";
        code.alt = "";

        guide.textContent =
          message("image.scan") || "image.scan";

        dom.set(guide, "data-i18n", "image.scan");

        code.src = await QRCode.toDataURL(url.href, {
          width: 240,
          margin: 1
        });

        content.append(code, guide);

        let off;

        await sheet({
          title: "image.phone",
          content,
          direction: "↓",
          ready: (_, close) => {
            off = profile.onLink(() => {
              close(true);
            });
          },
          actions: [
            {
              text: "image.cancel",
              icon: "close",
              data: ["data-neutral"]
            }
          ]
        });

        off?.();
      });

      return { button };
    };

    const choices = dom.has("wearable")
      ? [phone()]
      : [
          ...(dom.has("mobile")
            ? [choose("camera", "image.camera", true)]
            : []),
          choose("image", "image.gallery")
        ];

    dom.set(
      options,
      "data-columns",
      String(choices.length)
    );

    options.append(...choices.map(({ button }) => button));

    panel.append(
      stage.root,
      options,
      ...choices.map(({ input }) => input).filter(Boolean)
    );
    show();

    const saved = await sheet({
      title: "image.select",
      content: panel,
      stage: "full",
      direction: "↓",
      actions: [
        {
          text: "image.reset",
          icon: "reload",
          data: ["data-neutral"],
          close: false,
          run: () => {
            if (temporary && draftUrl) {
              URL.revokeObjectURL(draftUrl);
            }

            profile.clearLink();
            draft = undefined;
            draftUrl = undefined;
            temporary = false;
            show();
            return false;
          }
        },
        {
          text: "image.save",
          icon: "check",
          value: true,
          data: ["data-confirm"]
        }
      ]
    });

    offLink();

    if (!saved) {
      profile.clearLink();

      if (temporary && draftUrl) {
        URL.revokeObjectURL(draftUrl);
      }

      return;
    }

    if (url && url !== draftUrl) {
      URL.revokeObjectURL(url);
    }

    pending = draft;
    url = draftUrl;

    if (pending) {
      profile.clearLink();
    }

    media.set(url || source, pending?.edit);
  };

  dom.on(media.root, "click", () => {
    select().catch(() => {});
  });

  return {
    root,
    file: () => pending,
    saved: () => {
      pending = undefined;
    },
    busy: (value) => {
      media.root.disabled = value;

      if (value) {
        dom.set(root, "data-loading", "");
      } else {
        dom.remove(root, "data-loading");
      }
    },
    destroy: () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  };
};

const finish = async (user, picture, close) => {
  const root = dom.create("div");
  const greeting = dom.create("strong");
  const welcome = dom.create("p");
  const optional = dom.create("p");

  root.className = "setup-profile";
  dom.set(root, "data-pan", "");
  greeting.textContent = format("setup.greeting", {
    name: user.name
  });

  welcome.textContent = format("setup.welcome", {
    number: String(user.number)
  });

  optional.textContent =
    message("setup.optional") || "setup.optional";
  root.append(greeting, welcome, optional);

  return drawer({
    back: true,
    title: "setup.title",
    content: root,
    side: "right",
    direction: "→",
    actions: [
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

          if (uploaded.ok && file) {
            picture.saved();
          }

          const saved = uploaded.ok
            ? await profile.complete()
            : uploaded;

          if (saved.ok) {
            await close(true);
            await end(true);
            return false;
          }

          toast({
            type: "error",
            title:
              uploaded.status === 413
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
};

export default async function editor(user, ready) {
  const form = dom.create("div");
  const picture = portrait(
    user.avatar,
    user.image || user.avatar
  );
  const name = field("name");
  const email = field("email", "email");

  form.className = "setup-form";
  form.append(picture.root, name.root, email.root);
  name.input.value = user.name || "";
  email.input.value = user.email || "";

  let available = false;
  let emailValid = true;
  let saving = false;
  let timer;
  let version = 0;

  const refresh = () =>
    form.dispatchEvent(
      new Event("input", { bubbles: true })
    );

  dom.on(name.input, "input", () => {
    clearTimeout(timer);
    available = false;

    const value = name.input.value.trim();
    const current = ++version;

    if (!validName(value)) {
      state(name.status, "setup.nameInvalid", "error");
      return;
    }

    state(name.status, "setup.nameChecking", "mute");
    timer = setTimeout(async () => {
      const result = await profile.checkName(value);

      if (current !== version) {
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
        available
          ? "setup.nameAvailable"
          : "setup.nameUnavailable",
        available ? "success" : "error"
      );
      refresh();
    }, 300);
  });

  dom.on(email.input, "input", () => {
    const value = email.input.value.trim();

    emailValid = validEmail(value);

    if (!value) {
      email.status.textContent = "";
      dom.remove(email.status, "data-state");
      return;
    }

    state(
      email.status,
      emailValid
        ? "setup.emailAvailable"
        : "setup.emailInvalid",
      emailValid ? "success" : "error"
    );
  });

  const result = await dialog({
    back: true,
    title: "setup.title",
    content: form,
    locked: true,
    ready: (element) => {
      element.tabIndex = -1;
      element.focus({ preventScroll: true });
      ready?.();

      if (name.input.value) {
        name.input.dispatchEvent(
          new Event("input", { bubbles: true })
        );
      }

      if (email.input.value) {
        email.input.dispatchEvent(
          new Event("input", { bubbles: true })
        );
      }
    },
    actions: [
      {
        text: "setup.next",
        icon: "arrow",
        data: ["data-confirm"],
        close: false,
        disabled: () => saving || !available || !emailValid,
        run: async ({ close }) => {
          saving = true;
          refresh();

          try {
            const saved = await profile.save({
              name: name.input.value.trim(),
              email: email.input.value.trim()
            });

            if (!saved.ok) {
              if (saved.status === 409) {
                available = false;
                state(
                  name.status,
                  "setup.nameUnavailable",
                  "error"
                );
              } else {
                toast({
                  type: "error",
                  title: "setup.saveError"
                });
              }

              return false;
            }

            const linked = await profile.applyLink();

            if (!linked.ok) {
              toast({
                type: "error",
                title: "setup.uploadError"
              });

              return false;
            }

            await finish(saved.data, picture, close);

            return false;
          } finally {
            saving = false;
            refresh();
          }
        }
      }
    ]
  });

  clearTimeout(timer);
  picture.destroy();
  return result;
}
