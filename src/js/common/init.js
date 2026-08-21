import device from "#common/device";
import theme from "#common/theme";
import icon from "#common/icon";
import button from "#common/button";
import range from "#common/range";
import scroll from "#common/scroll";
import dialog from "#common/dialog";
import { all } from "#common/query";
import { bind as drag } from "#common/drag";

export default function init() {
  device();
  theme();
  icon();
  button();
  range();
  scroll();
  all(".dialog").forEach((item) => dialog(item));
  drag();
}
