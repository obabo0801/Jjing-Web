import device from "#common/device";
import theme from "#common/theme";
import icon from "#common/icon";
import button from "#common/button";
import scroll from "#common/scroll";
import { watch } from "#common/back";
import { bind as drag } from "#common/drag";

export default function init() {
  device();
  theme();
  icon();
  button();
  scroll();
  watch();
  drag();
}
