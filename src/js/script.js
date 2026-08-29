import * as dom from "#common/dom";
import i18n from "#common/i18n";
import init from "#common/init";
import dialog from "#common/dialog";
import sound from "#common/sound";
import * as tts from "#common/tts";
import push, { enabled as pushEnabled } from "#common/push";

import access from "#src/access";
import * as pwa from "#src/pwa";

const app = dom.query(".app");

const loading = init();

const column = (name, min, max, value) => {
  const element = dom.create("div");
  element.className = "picker-column";
  dom.set(element, "data-name", name);
  dom.set(element, "data-min", min);
  dom.set(element, "data-max", max);
  dom.set(element, "data-value", value);
  dom.set(element, "data-loop", "");

  return element;
};

try {
  const allowed = await access();

  if (allowed) {
    const [, registration] = await Promise.all([
      i18n(),
      pwa.load().catch(() => null)
    ]);
    app.hidden = false;

    tts.speak("접근 거부");

    const button = dom.query("[data-music]", app);
    dom.on(button, "click", () => sound.music("sunflower", { loop: true }));

    const notify = dom.query("[data-notify]", app);

    notify.checked = await pushEnabled(registration);

    dom.on(notify, "change", async () => {
      notify.disabled = true;

      try {
        const received = await push(notify.checked, registration);

        notify.checked = received;

        if (received) {
          await pwa.notify("알림 테스트", {
            body: "알림을 정상적으로 " + "받을 수 있습니다."
          });
        }
      } finally {
        notify.disabled = false;
      }
    });
    setTimeout(async () => {
      const time = dom.create("div");
      time.className = "picker";

      const period = dom.create("div");
      period.className = "picker-column";
      dom.set(period, "data-name", "period");
      dom.set(period, "data-period", "");
      dom.set(period, "data-values", "오전,오후");
      dom.set(period, "data-value", "오전");

      const hour = column("hour", 1, 12, 1);
      dom.set(hour, "data-hour", "");

      const divide = dom.create("span");
      divide.className = "picker-text";
      divide.textContent = ":";
      time.append(period, hour, divide, column("minute", 0, 59, 0));

      const message = dom.create("span");
      message.textContent = `내용입니다
      내용입니다
      내용입니다
      내용입니다
      내용입니다
      내용입니다
      내용입니다
      내용입니다
      내용입니다
      내용입니다
      내용입니다
      내용입니다`;

      const content = new DocumentFragment();

      const field = dom.create("div");
      field.className = "input";

      const input = dom.create("input");
      input.type = "text";
      input.name = "dialog";
      input.placeholder = "내용 입력";
      input.autocomplete = "off";

      dom.set(input, "data-control", "");

      field.append(input);
      content.append(message, field);

      const result = await dialog({
        title: "dialog.title",
        content,
        actions: [
          {
            value: false,
            text: "dialog.cancel",
            icon: "close",
            data: ["data-background"]
          },
          {
            value: true,
            text: "dialog.confirm",
            icon: "check",
            data: ["data-confirm"]
          }
        ],
        direction: "←"
      });

      if (result) {
        console.log(input.value.trim());
      }
    });
  }
} finally {
  loading.remove();
}
