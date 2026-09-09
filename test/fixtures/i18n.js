import { content } from "#shared/route";

export const langs = ["ko", "en"];
export const names = Array.from(
  { length: 600 },
  (_, index) => `sample.item${index}`
);
const dictionaries = Object.fromEntries(
  langs.map((lang) => [
    lang,
    Object.fromEntries(
      names.map((name, index) => [name, `${lang} 번역 ${index}`])
    )
  ])
);

export const locale = (lang) => dictionaries[lang];
export const root = { lang: "before" };
export const elements = [];
export const storage = new Map();
export const state = { base: "", requests: [], hook: null };
export const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64");
export const decode = (value) =>
  JSON.parse(Buffer.from(value, "base64").toString());
export const stored = (key, fallback) => storage.get(key) ?? fallback;
export const save = (key, value) => storage.set(key, value);
export const all = (selector) =>
  elements.filter((element) =>
    Object.hasOwn(element.attrs, selector.slice(1, -1))
  );
export const get = (element, attr) => element.attrs[attr];
export const query = (_, element) =>
  element.children.find((child) => child.className === "icon");

export const element = (key, attr = "data-i18n") => {
  const target = {
    attrs: { [attr]: key },
    children: [],
    value: "before",
    get textContent() {
      return this.value;
    },
    set textContent(value) {
      this.value = value;
      this.children = [];
    },
    prepend(child) {
      this.children.unshift(child);
    }
  };

  elements.push(target);
  return target;
};

// 실제 라우터로 보내되, 테스트에서 지연·HTTP 오류·잘못된 응답만 주입합니다.
export const api = async (path, options) => {
  const request = { path, ...decode(options.data[content]) };

  state.requests.push(request);
  const send = async () => {
    const response = await fetch(state.base + path, {
      method: options.method,
      headers: { "Content-Type": "application/json", "Accept-Language": "ko" },
      body: JSON.stringify(options.data)
    });

    return { ok: response.ok, data: await response.json() };
  };

  return state.hook ? state.hook(request, send) : send();
};
