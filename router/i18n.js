import { createHash } from "node:crypto";

import { Router } from "express";

import { langs, locale } from "#config/locale";
import { payload } from "#config/route";

const router = Router();

const offline = ["app.title", "offline.heading"];

const hash = (value) =>
  createHash("sha256").update(value.toLowerCase()).digest("hex").slice(0, 8);

const encode = (value) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64");

const decode = (value) =>
  JSON.parse(Buffer.from(value, "base64").toString("utf8"));

const files = Object.fromEntries(langs.map((lang) => [hash(lang), lang]));

const languages = Object.fromEntries(langs.map((lang) => [lang, hash(lang)]));

router.get("/", (req, res) => {
  res.json({ [payload]: encode(languages) });
});

router.get("/:file", (req, res) => {
  const lang = files[req.params.file];

  if (!lang) {
    return res.status(404).end();
  }

  const source = locale(lang);

  const text = Object.fromEntries(
    offline
      .filter((key) => Object.hasOwn(source, key))
      .map((key) => [key, source[key]])
  );

  res.json({ [payload]: encode({ lang, text }) });
});

router.post("/", (req, res) => {
  let body;

  try {
    body = decode(req.body?.[payload]);
  } catch {
    return res.status(400).end();
  }

  const mode =
    typeof body.lang === "string" ? body.lang.toLowerCase() : "system";

  const selected = mode === "system" ? req.acceptsLanguages(...langs) : mode;

  const lang = langs.includes(selected) ? selected : "ko";

  const source = Object.fromEntries(
    Object.entries(locale(lang)).map(([key, value]) => [hash(key), value])
  );

  const keys = Array.isArray(body.keys)
    ? [...new Set(body.keys.filter((key) => typeof key === "string"))].slice(
        0,
        100
      )
    : [];

  const text = Object.fromEntries(
    keys
      .filter((key) => Object.hasOwn(source, key))
      .map((key) => [key, source[key]])
  );

  const value = encode({ lang, text });

  res.json({ [payload]: value });
});

export default router;
