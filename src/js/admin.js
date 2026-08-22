import { admin } from "#config/route";

import { query, on } from "#common/dom";
import api from "#common/api";
import init from "#common/init";
import i18n from "#common/i18n";

const start = async () => {
  init();

  const check = await api(admin);

  if (!check.ok) {
    location.replace("/");
    return;
  }

  await i18n();

  const form = query(".admin-form");
  const output = query(".admin-result");

  on(form, "submit", async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(form));

    const response = await api(admin, {
      method: "POST",
      data
    });

    output.textContent = response.ok
      ? `${response.data.sent}/${response.data.failed}`
      : `${response.status}`;
  });
};

await start();
