import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as emoji from "#common/emoji";
import init from "#src/init";
import push, * as state from "#common/push";
import history from "#common/chatting/history";
import online from "#common/online";
import toolbar from "#common/toolbar";
import tools from "#common/chatting/toolbar";

import access from "#src/access";
import * as pwa from "#src/pwa";
import setup from "#src/setup";

const app = dom.query(".app");
const loading = init();
const message = new URLSearchParams(location.search).get("message") || "";

try {
  const allowed = await access();

  if (allowed) {
    const [, registration] = await Promise.all([
      i18n.translate(),
      pwa.load().catch(() => null),
      emoji.load()
    ]);

    if (await setup(() => loading.remove())) {
      app.hidden = false;

      const chat = dom.query(".chatting", app);
      const top = toolbar([{ icon: "user", text: "online.open", run: online }]);

      top.classList.add("chatting-toolbar");
      dom.set(top, "data-position", "top");
      dom.set(top.firstElementChild, "data-circle", "");
      dom.set(top.firstElementChild, "data-tooltip", "online.open");
      chat.prepend(top);

      const chatStyle = dom.query('select[name="chatting-style"]', app);

      dom.on(chatStyle, "change", () => {
        dom.set(chat, "data-chatting", chatStyle.value);
      });

      tools(chat, history(chat, message));

      const notify = dom.query("[data-notify]", app);

      const available = state.supported(registration);

      notify.closest(".switch").hidden = !available;
      notify.checked = available && (await state.enabled(registration));

      dom.on(notify, "change", async () => {
        notify.disabled = true;

        try {
          const received = await push(notify.checked, registration);

          notify.checked = received;
        } finally {
          notify.disabled = !available;
        }
      });
    }
  }
} finally {
  loading.remove();
}
