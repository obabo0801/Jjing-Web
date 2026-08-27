import * as dom from "#common/dom";
import device from "#common/device";
import theme from "#common/theme";
import icon from "#common/icon";
import button from "#common/button";
import input from "#common/input";
import toggle from "#common/switch";
import range from "#common/range";
import segment from "#common/segment";
import stepper from "#common/stepper";
import picker from "#common/picker";
import scroll from "#common/scroll";
import drag from "#common/drag";
import progress from "#common/progress";

export default function init() {
  const loading = dom.create("div");

  loading.className = "loading";

  progress({
    type: "circular",
    value: 25,
    showValue: false,
    target: loading
  });

  dom.body.append(loading);

  device();
  theme();
  icon();
  button();
  input();
  toggle();
  range();
  segment();
  stepper();
  picker();
  scroll();
  drag();

  return loading;
}
