import { create, reset as resetEditor, state } from "./editor.js";

export { create, set, remove, on } from "./editor.js";
export { state };

export const has = () => false;

export const reset = () => {
  resetEditor();
  Object.assign(state, {
    avatars: [],
    sheets: [],
    edits: [],
    notices: [],
    links: new Set(),
    cleared: 0,
    result: null,
    urls: [],
    revoked: []
  });
};

export const avatar = (source, tag = "div") => {
  const media = {
    root: create(tag),
    source,
    set(source, edit) {
      Object.assign(media, { source, edit });
    }
  };

  state.avatars.push(media);
  return media;
};

export const sheet = (options) => {
  const pending = Promise.withResolvers();

  options.content.isConnected = true;
  state.sheets.push({ ...options, ...pending });
  return pending.promise.finally(() => {
    options.content.isConnected = false;
  });
};

export const edit = async (file, options) => {
  state.edits.push({ file, options });
  return state.result;
};

export const toast = (options) => state.notices.push(options);

export const onLink = (listener) => {
  state.links.add(listener);
  return () => state.links.delete(listener);
};

export const linkImage = (token) => `/image/link/${token}`;

export const clearLink = () => {
  state.cleared += 1;
};
