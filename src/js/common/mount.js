import group from "#common/group";
import chatting from "#common/chatting";
import picker from "#common/picker";
import range from "#common/range";
import select from "#common/select";
import stepper from "#common/stepper";
import toggle from "#common/toggle";

export default function mount(root = document) {
  group(root);
  chatting(root);
  range(root);
  select(root);
  stepper(root);
  picker(root);
  toggle(root);
}
