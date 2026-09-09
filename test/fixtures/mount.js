// 컴포넌트의 DOM 탐색·이벤트 중복만 검증하는 최소 구현입니다.
export class Element extends EventTarget {
  constructor(tag = "div", selectors = []) {
    super();
    this.tag = tag;
    this.selectors = new Set(selectors);
    this.children = [];
    this.attributes = new Map();
    this.queries = new Map();
    this.listeners = [];
    this.style = {};
    this.dataset = {};
    this.className = "";
    this.classList = {
      contains: (name) => this.className.split(" ").includes(name)
    };
  }

  addEventListener(type, listener, options) {
    this.listeners.push({ type, listener, options });
    super.addEventListener(type, listener, options);
  }

  append(...children) {
    for (const child of children) {
      child.remove();
      child.parent = this;
      this.children.push(child);
    }
  }

  remove() {
    if (this.parent)
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
    this.parent = null;
  }

  after(element) {
    if (!this.parent) return;

    element.remove();
    element.parent = this.parent;
    this.parent.children.splice(
      this.parent.children.indexOf(this) + 1,
      0,
      element
    );
  }

  matches(selector) {
    return (
      this.selectors.has(selector) ||
      selector === this.tag ||
      (selector.startsWith(".") && this.classList.contains(selector.slice(1)))
    );
  }

  querySelectorAll(selector) {
    if (this.queries.has(selector)) return this.queries.get(selector);
    if (selector.startsWith(":scope > "))
      return this.children.filter((child) => child.matches(selector.slice(9)));
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector)
    ]);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  closest(selector) {
    return this.matches(selector)
      ? this
      : this.parent?.closest(selector) || null;
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

export const document = new Element("document");
document.documentElement = new Element("html");
document.body = new Element("body");
document.head = new Element("head");
document.scrollingElement = document.documentElement;
document.createElement = (tag) => new Element(tag);
document.append(document.documentElement);
document.documentElement.append(document.head, document.body);

export const window = new Element("window");
window.visualViewport = new Element("viewport");
