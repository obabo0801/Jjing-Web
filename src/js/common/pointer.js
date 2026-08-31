export const is = (event, type) =>
  event.pointerType === type;

export const press = (event) =>
  is(event, "mouse") && event.button === 0;

export const match = (event, id) =>
  is(event, "mouse") && event.pointerId === id;
