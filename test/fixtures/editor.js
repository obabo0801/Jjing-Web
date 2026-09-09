export const state = {};

class Element extends EventTarget {
  constructor(tag) {
    super();
    this.tag = tag;
    this.children = [];
    this.attributes = new Map();
    this.value = "";
    state.nodes.push(this);
  }

  append(...children) {
    children.forEach((child) => {
      child.parent = this;
      this.children.push(child);
    });
  }

  dispatchEvent(event) {
    const result = super.dispatchEvent(event);

    if (event.bubbles && this.parent) {
      this.parent.dispatchEvent(new Event(event.type, { bubbles: true }));
    }

    return result;
  }

  focus() {}
}

export const reset = () =>
  Object.assign(state, {
    nodes: [],
    checks: [],
    saves: [],
    agreed: true,
    disabled: true,
    options: null,
    pending: Promise.withResolvers()
  });

export const create = (tag) => new Element(tag);
export const set = (element, name, value) =>
  element.attributes.set(name, value);
export const remove = (element, name) => element.attributes.delete(name);
export const on = (element, type, listener) => {
  element.addEventListener(type, listener);
  return () => element.removeEventListener(type, listener);
};

export const dialog = (options) => {
  state.options = options;
  const validate = () => {
    state.disabled = options.actions[0].disabled();
  };

  options.content.addEventListener("input", validate);
  validate();
  options.ready(create("dialog"));
  return state.pending.promise;
};

export const avatar = () => ({ root: create("button"), set() {} });
export const consent = () => ({
  root: create("div"),
  valid: () => state.agreed,
  value: () => ({})
});

export const checkName = (name) => {
  const pending = Promise.withResolvers();

  state.checks.push({ name, ...pending });
  return pending.promise;
};

export const save = async (data) => {
  state.saves.push(data);
  return { ok: false, status: 409 };
};
