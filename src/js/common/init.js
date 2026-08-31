import * as dom from "#common/dom";
import device from "#common/device";
import theme from "#common/theme";
import icon from "#common/icon";
import button from "#common/button";
import input from "#common/input";
import tooltip from "#common/tooltip";
import toggle from "#common/switch";
import mount from "#common/mount";
import segment from "#common/segment";
import scroll from "#common/scroll";
import drag from "#common/drag";
import progress from "#common/progress";

export default function init() {
  const loading = dom.create("div");

  loading.className = "loading";

  const type = "circular";
  const value = 25;
  const show = false;
  const target = loading;

  progress({ type, value, show, target });

  dom.body.append(loading);

  device();
  theme();
  icon();
  button();
  input();
  tooltip();
  toggle();
  segment();
  mount();
  scroll();
  drag();

  return loading;
}
