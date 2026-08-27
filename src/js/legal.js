import init from "#common/init";
import i18n from "#common/i18n";
import access from "#src/access";

const loading = init();

try {
  const allowed = await access();

  if (allowed) {
    await i18n();
  }
} finally {
  loading.remove();
}
