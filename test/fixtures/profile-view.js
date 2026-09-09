import { Element as Base } from "./mount.js";

class Element extends Base {
  constructor(tag) {
    super(tag);
    this.value = "";
    this.classList.add = (name) => {
      this.className = `${this.className} ${name}`.trim();
    };
  }

  get childElementCount() {
    return this.children.length;
  }

  get lastElementChild() {
    return this.children.at(-1);
  }

  matches(selector) {
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);

    return attribute
      ? this.attributes.has(attribute[1]) &&
          (attribute[2] === undefined ||
            this.attributes.get(attribute[1]) === attribute[2])
      : super.matches(selector);
  }

  replaceWith(element) {
    this.after(element);
    this.remove();
  }
}

export const state = {};
export const root = { lang: "ko-KR" };
export const create = (tag) => new Element(tag);
export const query = (selector, element) => element?.querySelector(selector);
export const get = (element, name) => element.getAttribute(name);
export const set = (element, name, value) => element.setAttribute(name, value);
export const remove = (element, name) => element.removeAttribute(name);
export const on = (element, type, listener) => {
  element.addEventListener(type, listener);
  return () => element.removeEventListener(type, listener);
};

export const reset = () => {
  Object.assign(state, {
    user: {
      uid: "user-1234567890",
      name: "nickname",
      short: "user-123",
      avatar: "/avatar",
      image: "/original",
      state: "online",
      self: false,
      manage: false,
      blocked: false
    },
    reads: [],
    bindings: [],
    popovers: [],
    dialogs: [],
    drawers: [],
    viewers: [],
    avatars: [],
    authorities: [],
    mounts: [],
    changes: [],
    result: { ok: true },
    translations: 0
  });
};

export const read = async (uid, options) => {
  state.reads.push({ uid, options });
  return state.user ? { ok: true, data: state.user } : { ok: false };
};

export const bind = (element, uid, render) => {
  state.bindings.push({ element, uid, render });
};

export const popover = (options) => {
  const pending = Promise.withResolvers();

  state.popovers.push({ ...options, ...pending });
  return pending.promise;
};

export const dialog = (options) => {
  const pending = Promise.withResolvers();

  state.dialogs.push({ ...options, ...pending });
  return pending.promise;
};

export const drawer = async (options) => state.drawers.push(options);
export const viewer = async (...args) => state.viewers.push(args);
export const avatar = (_, tag) => {
  const media = {
    root: create(tag),
    set: (source) => {
      media.source = source;
    }
  };

  state.avatars.push(media);
  return media;
};

export const authority = (user) => {
  const element = create("div");

  element.className = "test-authority";
  state.authorities.push(user);
  return element;
};

export const mount = (element) => state.mounts.push(element);
export const preload = () => {};
export const message = (key) => key;
export const translate = () => {
  state.translations += 1;
};
export const block = async (...args) => {
  state.changes.push({ type: "block", args });
  return state.result;
};

export const unblock = async (...args) => {
  state.changes.push({ type: "unblock", args });
  return state.result;
};
