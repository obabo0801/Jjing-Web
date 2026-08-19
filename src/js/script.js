import root from "#common/root";
import { query } from "#common/query";
import { on } from "#common/event";
import init from "#common/init";
import i18n from "#common/i18n";
import access from "#src/access";
import pwa, { subscribe } from "#src/pwa";
init();

const allowed = await access();

if (allowed) {
  const [, registration] = await Promise.all([i18n(), pwa().catch(() => null)]);
}

root.removeAttribute("data-access");
