import { admin } from "#config/route";

import root from "#common/root";
import { query } from "#common/query";
import { on } from "#common/event";
import api from "#common/api";
import init from "#common/init";
import i18n from "#common/i18n";
import access from "#src/access";

const start = async () => {
  init();

  if (!(await access())) {
    root.removeAttribute("data-access");

    return;
  }

  const check = await api(admin);

  if (!check.ok) {
    location.replace("/");
    return;
  }

  await i18n();

  root.removeAttribute("data-access");

  const form = query("#form");
  const output = query("#result");

  on(form, "submit", async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(form));

    const response = await api(admin, { method: "POST", data });

    output.textContent = response.ok
      ? `${response.data.sent}/${response.data.failed}`
      : `${response.status}`;
  });
};

await start();
