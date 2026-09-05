import * as dom from "#common/dom";
import i18n from "#common/i18n";
import init from "#common/init";
import sound from "#common/sound";
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
      i18n(),
      pwa.load().catch(() => null)
    ]);

    if (await setup(() => loading.remove())) {
      app.hidden = false;

      const chat = dom.query(".chatting", app);
      const chatForm = dom.query(".chatting-form", chat);
      const chatInput = dom.query(
        ".chatting-input",
        chatForm
      );

      const chatStyle = dom.query(
        'select[name="chatting-style"]',
        app
      );

      append(chat, {
        text: "스트림과 메신저 스타일을 확인할 수 있습니다.",
        own: true
      });

      append(chat, {
        uid: "9cd41a93-4b97-4f33-9509-461c9cfe795b",
        name: "테스트",
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

      const button = dom.query("[data-music]", app);
      const volume = dom.query(
        'input[name="music-volume"]',
        app
      );

      let player;

      dom.on(button, "click", () => {
        if (player && !player.paused) {
          player.pause();
          player.currentTime = 0;
          button.textContent = "음악 재생";

          return;
        }

        player = sound.music("semenota", {
          volume: Number(volume.value) / 100,
          loop: true
        });

        if (player) {
          button.textContent = "음악 중단";
        }
      });

      dom.on(volume, "input", () => {
        if (!player || player.paused) {
          return;
        }

        player = sound.music("semenota", {
          volume: Number(volume.value) / 100,
          loop: true
        });
      });

      const notify = dom.query("[data-notify]", app);

      const available = state.supported(registration);

      notify.closest(".switch").hidden = !available;
      notify.checked =
        available && (await state.enabled(registration));

      dom.on(notify, "change", async () => {
        notify.disabled = true;

        try {
          const received = await push(
            notify.checked,
            registration
          );

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
