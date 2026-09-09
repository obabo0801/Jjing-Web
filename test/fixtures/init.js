import { Element, document } from "./mount.js";

export const calls = [];
export const body = document.body;
export const create = (tag) => new Element(tag);
export const record = (name, ...args) => calls.push({ name, args });
