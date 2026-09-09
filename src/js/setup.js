import * as dom from "#common/dom";
import * as profile from "#common/profile";
import editor from "#common/profile/editor";
import popover from "#common/popover";

const content = (setup) => {
  const root = dom.create("div");
  const message = dom.create("p");
  const detail = dom.create("div");

  root.className = "setup-intro";
  detail.className = "setup-intro-detail";

  dom.set(message, "data-i18n", setup ? "setup.start" : "setup.profile");

  if (!setup) {
    const reason = dom.create("p");
    const optional = dom.create("p");

    dom.set(reason, "data-i18n", "setup.reason");
    dom.set(optional, "data-i18n", "setup.optional");

    detail.append(reason, optional);
    root.append(message, detail);
  } else {
    root.append(message);
  }

  return root;
};

export default async function setup(ready) {
  const result = await profile.read("me", { fresh: true });

  if (!result.ok) {
    return false;
  }

  const user = result.data;

  return popover({
    title: "setup.intro",
    content: content(user.setup),
    locked: true,
    ready,
    actions: [
      {
        text: user.setup ? "setup.complete" : "setup.create",
        icon: user.setup ? "check" : "arrow",
        data: ["data-confirm"],
        close: user.setup,
        value: true,
        run: user.setup
          ? undefined
          : async ({ close }) => {
              const complete = await editor(user);

              if (!complete) {
                return false;
              }

              await close(true);
              return false;
            }
      }
    ]
  });
}
