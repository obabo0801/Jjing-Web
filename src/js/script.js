import root from "#common/root";
import init from "#common/init";
import i18n from "#common/i18n";
import access from "#src/access";
import pwa from "#src/pwa";

import menu from "#ui/menu";
import search from "#ui/search";

init();

const allowed = await access();

if (allowed) {
  const [, registration] = await Promise.all([i18n(), pwa().catch(() => null)]);

  await menu(registration);
  search();
}

root.removeAttribute("data-access");
