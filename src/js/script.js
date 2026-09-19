import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import * as emoji from "#common/emoji";
import init from "#src/init";
import * as settings from "#common/settings";
import history from "#common/chatting/history";
import toolbar from "#common/toolbar";
import tools from "#common/chatting/toolbar";
import * as route from "#common/route";

import access from "#src/access";
import * as pwa from "#src/pwa";
import setup from "#src/setup";
import header from "#src/header";
import * as login from "#common/login";
import * as menu from "#common/menu";
import * as direct from "#common/chatting/direct";

import caption from "#common/caption";

const app = dom.query(".app");
const loading = init();
const url = new URL(location.href);
const message = url.searchParams.get("message") || window.history.state?.message || "";

if (url.searchParams.has("message") || url.searchParams.get("push") === "1") {
  url.searchParams.delete("push");
  url.searchParams.delete("message");
  window.history.replaceState({ ...window.history.state, message }, "", url);
}

try {
  const allowed = await access();

  if (allowed) {
    await Promise.all([
      i18n.translate(),
      pwa.load().catch(() => null),
      emoji.load(),
      settings.load()
    ]);

    caption({ key: "sound.preview", background: "rgb(0 0 0 / 80%)", color: "#ffffff" });

    caption({ key: "sound.preview" });

    const image = new URL("../assets/google/g.png", import.meta.url).href;

    caption({ parts: ["이미지 ", { image, alt: "로고" }, "를 문장 안에도 표시합니다."] });

    caption({
      name: { text: "운종", bold: true },
      parts: [
        "지금은 ",
        { text: "중요한 안내", color: "#ffd877", bold: true },
        "입니다. ",
        { key: "terms.title", url: "/terms", bold: true }
      ]
    });

    caption({
      parts: [
        "자세한 내용은 ",
        { text: "이용약관", url: "/terms", color: "#ffd877" },
        "에서 확인해 주세요."
      ],
      duration: 8000
    });

    if (url.searchParams.get("popup") !== "1") {
      loading.remove();
      await login.pending();
    }

    if (await setup(() => loading.remove())) {
      app.hidden = false;
      header(app);

      const chat = dom.query(".chatting", app);
      const top = toolbar([
        { icon: "menu", text: "menu.chatMenu", run: () => menu.chatSettings() }
      ]);

      top.classList.add("chatting-toolbar");
      dom.set(top, "data-position", "top");
      [...top.children].forEach((button) => {
        dom.set(button, "data-circle", "");
        dom.set(button, "data-scale", "");
        dom.set(button, "data-tooltip", "menu.chatMenu");
      });

      chat.prepend(top);

      tools(chat, history(chat, message));
      direct.listen(document);
      await route.restore();
    }
  }
} finally {
  loading.remove();
}
