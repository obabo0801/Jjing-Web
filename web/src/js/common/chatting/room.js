import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as context from "#common/chatting/current";
import { chatting as path } from "#shared/route";
import api from "#common/api";
import mount from "#common/mount";
import events from "#common/events";
import history from "./history.js";
import tools from "./toolbar.js";

i18n.preload(
  ...["title", "empty", "error", "active", "closed", "archived", "back"].map(
    (key) => `rooms.${key}`
  )
);

export function item(room, run) {
  const button = dom.create("button");
  const label = dom.create("div");
  const name = dom.create("span");
  const state = dom.create("span");

  button.type = "button";
  button.className = "group-item";
  label.className = "label";
  name.className = "label-key";
  state.className = "label-value";
  name.textContent = room.name;
  state.textContent = i18n.message(`rooms.${room.state}`);
  dom.set(state, "data-i18n", `rooms.${room.state}`);
  dom.set(button, "data-icon", "chat");
  dom.set(button, "data-color", "");
  dom.set(button, "data-response", "");
  label.append(name, state);
  if (room.info) {
    const info = dom.create("span");

    info.className = "label-value";
    info.textContent = room.info;
    label.append(info);
  }

  button.append(label);
  dom.on(button, "click", run);
  return button;
}

export default async function rooms(chat, message) {
  if (!context.room) {
    chat.hidden = true;

    const root = dom.create("section");
    const title = dom.create("h2");
    const list = dom.create("div");

    root.className = "public";
    title.textContent = i18n.message("rooms.title");
    dom.set(title, "data-i18n", "rooms.title");
    list.className = "group";
    root.append(title, list);
    chat.before(root);

    const result = await api(`${path}/public`);

    if (result.ok && result.data.items.length) {
      list.append(
        ...result.data.items.map((room) => item(room, () => location.assign(`/rooms/${room.id}`)))
      );
    } else {
      const empty = dom.create("p");
      const key = result.ok ? "rooms.empty" : "rooms.error";

      empty.textContent = i18n.message(key);
      dom.set(empty, "data-i18n", key);
      list.append(empty);
    }

    mount(root);
    return;
  }

  const response = await api(`${path}/public/${context.room}`);

  if (!response.ok) {
    chat.hidden = true;
    if (response.status === 404) location.replace(`/rooms/${context.room}`);
    else {
      const error = dom.create("p");

      error.textContent = i18n.message("rooms.error");
      dom.set(error, "data-i18n", "rooms.error");
      chat.before(error);
    }
    return;
  }
  const room = response.data;
  const heading = dom.create("div");
  const back = dom.create("a");
  const title = dom.create("h2");
  const state = dom.create("span");

  heading.className = "public-heading";
  back.href = "/";
  dom.set(back, "data-icon", "arrow");
  dom.set(back, "data-direction", "left");
  dom.set(back, "data-tooltip", "rooms.back");
  dom.set(back, "data-response", "");
  title.textContent = room.name;
  heading.append(back, title, state);
  chat.prepend(heading);

  const form = dom.query(".chatting-form", chat);
  const update = () => {
    title.textContent = room.name;
    state.textContent = i18n.message(`rooms.${room.state}`);
    dom.set(state, "data-i18n", `rooms.${room.state}`);
    form.hidden = room.state !== "active";
    dom.query(".chatting-input", chat).disabled = room.state !== "active";
  };

  update();

  const controller = history(chat, message, room);

  tools(chat, controller);

  const refresh = async () => {
    const current = await api(`${path}/public/${context.room}`);

    if (current.status === 404) {
      controller.destroy();
      location.replace(`/rooms/${context.room}`);
    } else if (current.ok) {
      Object.assign(room, current.data);
      update();
      controller.recover();
    }
  };

  for (const type of ["public-room", "role", "ready"]) dom.on(events(), type, refresh);

  mount(heading);
}
