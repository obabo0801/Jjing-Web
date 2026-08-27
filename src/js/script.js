import * as dom from "#common/dom";
import i18n from "#common/i18n";
import init from "#common/init";
import dialog from "#common/dialog";

import access from "#src/access";
import * as pwa from "#src/pwa";

const app = dom.query(".app");

const loading = init();

try {
  const allowed = await access();

  if (allowed) {
    await Promise.all([
      i18n(),
      pwa.load().catch(() => null)
    ]);

    app.hidden = false;

    setTimeout(async () => {
      const result = await dialog({
        title: "app.title",
        content: "app.title",
        fullscreen: true,
        direction: "←",

        actions: [
          {
            value: "cancel",
            text: "app.title",
            icon: "close",
            data: ["background"]
          },
          {
            value: "confirm",
            text: "app.title",
            icon: "plus",
            data: ["confirm"]
          }
        ]
      });

      console.log(result);
    });
  }
} finally {
  loading.remove();
}
