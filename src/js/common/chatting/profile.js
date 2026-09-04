import * as dom from "#common/dom";
import * as profile from "#common/profile";
import avatar from "#common/avatar";
import show from "#common/profile/view";

export default function chattingProfile(target, options) {
  const root = dom.create("div");
  const picture = avatar(options.avatar, "button");
  const name = dom.create("button");
  const uid = options.own ? "me" : options.uid;

  root.className = "chatting-profile";
  picture.root.classList.add("chatting-avatar");
  picture.root.tabIndex = -1;
  name.type = "button";
  name.className = "chatting-name";

  dom.set(picture.root, "data-response", "");
  dom.set(name, "data-response", "");
  root.append(picture.root);

  const render = (user) => {
    name.textContent = user.name || options.name || "";
    picture.set(user.avatar || options.avatar || "");

    if (name.textContent && !name.isConnected) {
      root.append(name);
    } else if (!name.textContent) {
      name.remove();
    }
  };

  const open = (anchor) =>
    show(anchor, target, {
      ...options,
      ...(uid ? profile.value(uid) : null),
      context: "chatting"
    }).catch(() => {});

  render(options);
  dom.on(picture.root, "click", () => open(picture.root));
  dom.on(name, "click", () => open(name));

  if (uid) {
    profile.bind(root, uid, render);
    profile.read(uid).catch(() => {});
  }

  return root;
}
