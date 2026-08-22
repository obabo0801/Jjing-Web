import init from "#common/init";
import i18n from "#common/i18n";
import access from "#src/access";
import * as pwa from "#src/pwa";

const loading = init();

try {
  const allowed = await access();

  if (allowed) {
    await Promise.all([
      i18n(),
      pwa.load().catch(() => null)
    ]);
  }
} finally {
  loading.remove();
}
