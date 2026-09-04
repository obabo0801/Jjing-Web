import { admin } from "#config/route";

import * as dom from "#common/dom";
import api from "#common/api";
import i18n from "#common/i18n";
import init from "#common/init";
import upload from "#common/upload";

const send = async (form) => {
  const fields = new FormData(form);
  const file = fields.get("image");

  fields.delete("image");

  let image = "";

  if (file instanceof File && file.size) {
    const result = await upload(`${admin}/image`, file);

    if (!result.ok) {
      return result;
    }

    image = result.data?.image || "";
  }

  return api(admin, {
    method: "POST",
    data: { ...Object.fromEntries(fields), image }
  });
};

const start = async () => {
  const loading = init();

  try {
    const check = await api(admin);

    if (!check.ok) {
      location.replace("/");
      return;
    }

    await i18n();

    const form = dom.query(".admin-form");
    const output = dom.query(".admin-result");

    dom.on(form, "submit", async (event) => {
      event.preventDefault();

      const button = event.submitter;

      if (button) {
        button.disabled = true;
      }

      try {
        const response = await send(form);

        output.textContent = response.ok
          ? `${response.data.sent}/` +
            `${response.data.failed}`
          : String(response.status);

        if (response.ok) {
          form.elements.image.value = "";
        }
      } finally {
        if (button) {
          button.disabled = false;
        }
      }
    });
  } finally {
    loading.remove();
  }
};

await start();
