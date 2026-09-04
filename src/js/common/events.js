import { events as path } from "#config/route";

import * as dom from "#common/dom";
import api from "#common/api";
import * as registry from "#common/chatting/registry";
import * as profile from "#common/profile";

let source;
let role = 1;

const blocks = new Set();

export const isAdmin = () => role === 0;
export const isBlocked = (uid) => blocks.has(uid);

const data = (event) => {
  try {
    return JSON.parse(event.data);
  } catch {
    return {};
  }
};

const presence = (event) => {
  const value = data(event);

  profile.presence(value.uid, value.state);
};

let touched = 0;

const activity = () => {
  const now = Date.now();

  if (now - touched < 60_000) {
    return;
  }

  touched = now;
  api(path, { method: "POST" }).catch(() => {});
};

const watch = () => {
  dom.on(document, "pointerdown", activity, true);
  dom.on(document, "keydown", activity, true);
  dom.on(document, "scroll", activity, true);
  dom.on(document, "visibilitychange", () => {
    if (document.visibilityState === "visible") {
      activity();
    }
  });
};

const blocked = (event) => {
  const { uid } = data(event);

  if (!uid) {
    return;
  }

  blocks.add(uid);
  registry.messageAll(uid).forEach((element) => {
    if (isAdmin()) {
      dom.set(element, "data-blocked", "");
    } else {
      element.remove();
    }
  });
};

export default function events() {
  if (source || typeof EventSource === "undefined") {
    return source;
  }

  watch();
  source = new EventSource(`/api${path}`);
  source.addEventListener("ready", (event) => {
    role = Number(data(event).role) === 0 ? 0 : 1;
  });
  source.addEventListener("presence", presence);
  source.addEventListener("profile-image", (event) => {
    profile.receiveLink(data(event).token);
  });
  source.addEventListener("chatting-block", blocked);
  source.addEventListener("block", () => {
    location.reload();
  });

  return source;
}
