import * as dom from "#common/dom";
import * as input from "#common/input";
import * as emoji from "#common/emoji";
import toast from "#common/toast";

export const enter = (event) =>
  event.key === "Enter" &&
  !event.shiftKey &&
  !event.isComposing &&
  event.keyCode !== 229;

const text = (node) => {
  if (node.nodeType === Node.TEXT_NODE) return node.data;
  if (node.hasAttribute?.("data-caret")) return "";
  if (node.hasAttribute?.("data-emoji")) return dom.get(node, "data-emoji");
  if (node.nodeName === "BR") return "\n";
  return [...node.childNodes].reduce((value, child) => {
    const line = /^(DIV|P)$/.test(child.nodeName);

    return (
      value + (line && value && !value.endsWith("\n") ? "\n" : "") + text(child)
    );
  }, "");
};

export default function editor(field) {
  const view = dom.create("div");
  const past = [];
  const future = [];

  let composing = false;
  let syncing = false;
  let before;

  view.className = "chatting-editor";
  view.tabIndex = 0;
  dom.set(view, "data-control", "");
  dom.set(view, "enterkeyhint", "send");
  field.hidden = true;
  field.after(view);

  const state = () => ({
    value: field.value,
    start: field.selectionStart,
    end: field.selectionEnd
  });

  const selection = () => {
    const selected = getSelection();

    if (!selected?.rangeCount) return;
    const range = selected.getRangeAt(0);

    if (!view.contains(range.commonAncestorContainer)) return;
    const offset = (node, position) => {
      const prefix = document.createRange();

      prefix.selectNodeContents(view);
      prefix.setEnd(node, position);
      return text(prefix.cloneContents()).length;
    };

    field.setSelectionRange(
      offset(range.startContainer, range.startOffset),
      offset(range.endContainer, range.endOffset)
    );
  };

  const point = (offset) => {
    let passed = 0;

    for (const node of view.childNodes) {
      const size = text(node).length;

      if (offset <= passed + size) {
        if (node.nodeType === Node.TEXT_NODE)
          return [node, Math.max(0, offset - passed)];
        const index = [...view.childNodes].indexOf(node);

        return [view, index + (offset > passed ? 1 : 0)];
      }
      passed += size;
    }
    return [view, view.childNodes.length];
  };

  const paint = () => {
    const start = field.selectionStart;
    const end = field.selectionEnd;

    view.replaceChildren(emoji.fragment(field.value, true));
    if (field.value.endsWith("\n")) {
      const caret = dom.create("br");

      dom.set(caret, "data-caret", "");
      view.append(caret);
    }
    view.toggleAttribute("data-empty", !field.value);
    if (document.activeElement !== view) return;
    const range = document.createRange();
    const selected = getSelection();

    range.setStart(...point(start));
    range.setEnd(...point(end));
    selected.removeAllRanges();
    selected.addRange(range);
  };

  const notify = () => {
    syncing = true;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    syncing = false;
  };

  const remember = (previous) => {
    past.push(previous);
    if (past.length > 100) past.shift();
    future.length = 0;
  };

  const apply = (value, start, end = start) => {
    before = undefined;
    field.value = value;
    field.setSelectionRange(start, end);
    paint();
    notify();
  };

  const insert = (value, focus = true) => {
    if (field.disabled || field.readOnly || composing) return false;
    const previous = state();
    const next =
      previous.value.slice(0, previous.start) +
      value +
      previous.value.slice(previous.end);

    if (field.maxLength >= 0 && next.length > field.maxLength) return false;
    remember(previous);

    if (focus) {
      view.focus({ preventScroll: true });
    }

    apply(next, previous.start + value.length);
    return true;
  };

  const compose = () => {
    const value = view.innerHTML === "<br>" ? "" : text(view);

    if (field.value === value) {
      return;
    }

    field.value = value;
    view.toggleAttribute("data-empty", !value);
    notify();
  };

  const commit = () => {
    if (composing) return;
    const value = view.innerHTML === "<br>" ? "" : text(view);
    const previous = before || state();

    before = undefined;
    if (
      field.disabled ||
      field.readOnly ||
      (field.maxLength >= 0 && value.length > field.maxLength)
    ) {
      field.value = previous.value;
      field.setSelectionRange(previous.start, previous.end);
      paint();
      if (!field.disabled && !field.readOnly)
        toast({ text: "chatting.tooLong", type: "warning" });
      return;
    }
    // DOM상의 커서를 키워드 길이 기준으로 보존한 뒤 이미지를 다시 만듭니다.
    field.value = value;
    selection();
    if (previous.value !== value) remember(previous);
    paint();
    if (previous.value !== value) notify();
  };

  const undo = (redo = false) => {
    if (field.disabled || field.readOnly || composing) return;
    const from = redo ? future : past;
    const to = redo ? past : future;
    const previous = from.pop();

    if (!previous) return;
    to.push(state());
    apply(previous.value, previous.start, previous.end);
  };

  const sync = () => {
    if ((field.disabled || field.readOnly) && composing) {
      composing = false;
      before = undefined;
      paint();
    }
    view.contentEditable = String(!field.disabled && !field.readOnly);
    view.tabIndex = field.disabled ? -1 : 0;
    dom.set(view, "data-placeholder", field.placeholder);
  };

  dom.on(document, "selectionchange", () => {
    if (!composing && document.activeElement === view) selection();
  });

  dom.on(view, "blur", () => {
    if (!composing) selection();
  });

  dom.on(view, "beforeinput", (event) => {
    if (field.disabled || field.readOnly) {
      event.preventDefault();
      return;
    }
    if (composing || event.isComposing) return;
    selection();
    before = state();
    const type = event.inputType;

    if (type === "historyUndo" || type === "historyRedo") {
      event.preventDefault();
      undo(type === "historyRedo");
    } else if (type === "insertParagraph" || type === "insertLineBreak") {
      event.preventDefault();
      if (!insert("\n")) toast({ text: "chatting.tooLong", type: "warning" });
    } else if (type?.startsWith("format")) {
      event.preventDefault();
    } else if (
      type === "deleteContentBackward" ||
      type === "deleteContentForward"
    ) {
      const offset = field.selectionStart;
      const backward = type === "deleteContentBackward";

      let passed = 0;

      for (const node of view.childNodes) {
        const size = text(node).length;

        if (
          field.selectionEnd === offset &&
          node.hasAttribute?.("data-emoji") &&
          offset === passed + (backward ? size : 0)
        ) {
          event.preventDefault();
          field.setSelectionRange(passed, passed + size);
          insert("");
          break;
        }
        passed += size;
      }
    }
  });

  dom.on(view, "input", () => {
    if (composing) {
      compose();
      return;
    }

    commit();
  });

  dom.on(view, "compositionstart", () => {
    selection();
    before = state();
    composing = true;
    // 전송 대기 중 시작한 한글 조합도 새로운 편집으로 취급합니다.
    notify();
  });

  dom.on(view, "compositionend", () => {
    composing = false;
    commit();
  });

  dom.on(view, "keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.isComposing)
      return;
    const key = event.key.toLowerCase();

    if (key === "z" || key === "y") {
      event.preventDefault();
      undo(key === "y" || event.shiftKey);
    }
  });
  for (const type of ["copy", "cut"]) {
    dom.on(view, type, (event) => {
      if (composing || !event.clipboardData) return;
      selection();
      event.preventDefault();
      event.clipboardData.setData(
        "text/plain",
        field.value.slice(field.selectionStart, field.selectionEnd)
      );
      if (type === "cut") insert("");
    });
  }
  dom.on(view, "paste", (event) => {
    event.preventDefault();
    selection();
    const value = event.clipboardData?.getData("text/plain") || "";

    if (value && !insert(value.replace(/\r\n?/g, "\n")))
      toast({ text: "chatting.tooLong", type: "warning" });
  });
  dom.on(view, "drop", (event) => event.preventDefault());
  dom.on(view, "dragstart", (event) => event.preventDefault());
  dom.on(field, "input", () => {
    if (syncing) return;
    before = undefined;
    past.length = future.length = 0;
    paint();
  });

  dom.on(field.form, "reset", () =>
    queueMicrotask(() => {
      past.length = future.length = 0;
      paint();
    })
  );
  const observer = new MutationObserver(sync);

  observer.observe(field, {
    attributes: true,
    attributeFilter: ["disabled", "readonly", "placeholder"]
  });
  input.register(field, insert);
  sync();
  paint();
  emoji.load().then(() => {
    if (!composing && view.isConnected) paint();
  });
  return view;
}
