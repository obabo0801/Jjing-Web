import i18n from "#common/i18n";
import theme from "#common/theme";
import access from "#src/access";

theme();

await access(false, "maintenance");
await i18n();
