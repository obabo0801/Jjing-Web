export const on = (
  target, type, listener, options
) => {
  if (!target?.addEventListener) {
    return () => {};
  }

  target.addEventListener(
    type, listener, options
  );

  return () => {
    target.removeEventListener(
      type, listener, options
    );
  };
};
