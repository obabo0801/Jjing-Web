import * as dom from "#common/dom";
import device from "#common/device";
import theme from "#common/theme";
import icon from "#common/icon";
import button from "#common/button";
import input from "#common/input";
import toggle from "#common/switch";
import mount from "#common/mount";
import segment from "#common/segment";
import scroll from "#common/scroll";
import drag from "#common/drag";
import progress from "#common/progress";

export default function init() {
  const loading = dom.create("div");
  loading.className = "loading";
  progress({ type: "circular", value: 25, showValue: false, target: loading });
  dom.body.append(loading);
  device();
  theme();
  icon();
  button();
  input();
  toggle();
  segment();
  mount();
  scroll();
  drag();

  return loading;
}
