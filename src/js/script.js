import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import init from "#src/init";
import push, * as state from "#common/push";
import { append } from "#common/chatting";

import access from "#src/access";
import * as pwa from "#src/pwa";
import setup from "#src/setup";

const app = dom.query(".app");
const loading = init();

try {
  const allowed = await access();

  if (allowed) {
    const [, registration] = await Promise.all([
      i18n.translate(),
      pwa.load().catch(() => null)
    ]);

    if (await setup(() => loading.remove())) {
      app.hidden = false;

      const chat = dom.query(".chatting", app);
      const chatForm = dom.query(".chatting-form", chat);
      const chatInput = dom.query(".chatting-input", chatForm);

      const chatStyle = dom.query('select[name="chatting-style"]', app);

      append(chat, {
        text: "스트림과 메신저 스타일을 확인할 수 있습니다.",
        own: true
      });

      append(chat, {
        uid: "d4a5ac84-2e5b-42c2-918e-e86aa0e2999a",
        text: "채팅 테스트 메시지입니다."
      });

      append(chat, {
        uid: "40be1243-3400-49de-8ba3-242c76054c38",
        text: "채팅 테스트 메시지입니다."
      });

      append(chat, {
        uid: "08242c46-ae73-437f-9e8a-e6a8994cd8e0",
        text: "채팅 테스트 메시지입니다."
      });

      dom.on(chatStyle, "change", () => {
        dom.set(chat, "data-chatting", chatStyle.value);
      });

      dom.on(chatForm, "submit", (event) => {
        event.preventDefault();

        const text = chatInput.value.trim();

        if (!text) {
          return;
        }

        append(chat, { text, own: true });

        chatForm.reset();
      });

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
