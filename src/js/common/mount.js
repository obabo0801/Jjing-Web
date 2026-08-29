import picker from "#common/picker";
import range from "#common/range";
import stepper from "#common/stepper";

export default function mount(root = document) {
  range(root);
  stepper(root);
  picker(root);
}
