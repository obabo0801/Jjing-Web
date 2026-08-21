import { on } from "#common/event";
import { speak } from "#common/tts";
import recognize, { stop as stopVoice } from "#common/voice";

const create = (name, className) => {
  const item = document.createElement(name);

  if (className) {
    item.className = className;
  }

  return item;
};

const action = (className, icon, type) => {
  const button = create("button", className);

  button.type = type;
  button.setAttribute("data-action", "");
  button.setAttribute("data-circle", "");
  button.setAttribute("data-icon", icon);

  return button;
};

const wrapper = create("div");
const search = create("form", "search");
const field = create("div", "input");
const actions = create("div", "input-actions");

export const input = create("input", "search-input");
export const voice = action("voice", "voice", "button");
export const submit = action("submit", "search", "submit");

search.role = "search";
input.type = "search";
input.name = "search";
input.autocomplete = "off";
input.enterKeyHint = "search";
input.setAttribute("data-control", "");
input.setAttribute("data-i18n-placeholder", "search.placeholder");

actions.append(voice, submit);
field.append(input, actions);
search.append(field);
wrapper.append(search);

document.querySelector(".app").prepend(wrapper);

let loaded = false;

const apply = (result) => {
  if (!result?.text) {
    return;
  }

  input.value = result.text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

export default function load() {
  if (loaded) {
    return;
  }

  on(search, "submit", async (event) => {
    event.preventDefault();

    const result = await stopVoice();

    if (result) {
      apply(result);
    }

    input.blur();
    await speak(input.value);
  });

  on(voice, "click", async () => {
    apply(await recognize([], input));
  });

  loaded = true;
}
