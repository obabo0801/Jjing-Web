import * as i18n from "#common/i18n";

const placeholder = (element, value) => {
  element.placeholder = value;
};

export default function input() {
  return i18n.register(
    "data-i18n-placeholder",
    placeholder
  );
}
