import * as dom from "#common/dom";
import * as i18n from "#common/i18n";

const key = "chatting.yesterday";
const day = 86_400_000;

i18n.preload(key);

const parse = (value) => {
  if (value instanceof Date || typeof value === "number") {
    return new Date(value);
  }

  const source = String(value ?? "").trim();

  if (!source) {
    return new Date();
  }

  return new Date(
    source.includes("T")
      ? source
      : `${source.replace(" ", "T")}+09:00`
  );
};

const date = (value) =>
  Date.UTC(
    value.getFullYear(),
    value.getMonth(),
    value.getDate()
  );

const pad = (value) => String(value).padStart(2, "0");

export const stamp = (value) => {
  const result = parse(value).getTime();

  return Number.isFinite(result) ? result : Date.now();
};

export const detail = (value) => {
  const source = parse(value);
  const lang = dom.root.lang || navigator.language;
  const clock = new Intl.DateTimeFormat(lang, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(source);

  const full = [
    source.getFullYear(),
    pad(source.getMonth() + 1),
    pad(source.getDate())
  ].join("-");

  return `${full} ${clock}`;
};

export const format = (value) => {
  const source = parse(value);
  const now = new Date();
  const lang = dom.root.lang || navigator.language;
  const clock = new Intl.DateTimeFormat(lang, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(source);
  const passed = (date(now) - date(source)) / day;

  if (passed === 0) {
    return clock;
  }

  if (passed === 1) {
    return `${i18n.message(key)} ${clock}`.trim();
  }

  const full = [
    source.getFullYear(),
    pad(source.getMonth() + 1),
    pad(source.getDate())
  ].join("-");

  return `${full} ${clock}`;
};
