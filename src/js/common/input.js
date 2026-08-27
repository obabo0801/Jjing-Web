import { register } from "#common/i18n";

const placeholder = (element, value) => {
  element.placeholder = value;
};

export default function input() {
  return register("data-i18n-placeholder", placeholder);
}
