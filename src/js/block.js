import init from "#common/init";
import i18n from "#common/i18n";
import access from "#src/access";

init();

await access(false, "block");
await i18n();
