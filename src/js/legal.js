import init from "#common/init";
import i18n from "#common/i18n";
import access from "#src/access";

init();

await access();
await i18n();
