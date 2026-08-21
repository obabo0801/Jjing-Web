const create = (name, className) => {
  const item = document.createElement(name);

  if (className) {
    item.className = className;
  }

  return item;
};

const translate = (name, key) => {
  const item = create(name);

  item.setAttribute("data-i18n", key);

  return item;
};

export const permission = (name) => {
  const wrapper = create("div");
  const view = create("dialog", "dialog");
  const panel = create("div", "dialog-panel");
  const content = create("div", "dialog-content");
  const actions = create("div", "dialog-actions");
  const confirm = translate("button", `${name}.permission.confirm`);

  view.setAttribute("data-permission", name);
  confirm.type = "button";
  confirm.setAttribute("data-confirm", "");

  content.append(
    translate("h2", `${name}.permission.heading`),
    translate("p", `${name}.permission.message`)
  );

  actions.append(confirm);
  panel.append(content, actions);
  view.append(panel);
  wrapper.append(view);
  document.querySelector(".app").append(wrapper);

  return { confirm, view };
};

export const question = (name) => {
  const wrapper = create("div");
  const view = create("dialog", "dialog");
  const panel = create("form", "dialog-panel");
  const content = create("div", "dialog-content");
  const actions = create("div", "dialog-actions");
  const cancel = translate("button", `${name}.cancel`);
  const confirm = translate("button", `${name}.confirm`);

  panel.method = "dialog";
  cancel.type = "submit";
  cancel.value = "cancel";
  cancel.setAttribute("data-background", "");
  cancel.setAttribute("data-shadow", "");
  confirm.type = "submit";
  confirm.value = "confirm";
  confirm.setAttribute("data-confirm", "");
  confirm.setAttribute("data-shadow", "");

  content.append(
    translate("h2", `${name}.heading`),
    translate("p", `${name}.message`)
  );

  actions.append(cancel, confirm);
  panel.append(content, actions);
  view.append(panel);
  wrapper.append(view);
  document.querySelector(".app").append(wrapper);

  return view;
};

const voice = permission("voice");

export const confirm = voice.confirm;
export const notification = permission("notification");

export default voice.view;
