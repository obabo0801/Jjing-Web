export const messages = [];

export const send = (uid, type, data) => messages.push({ uid, type, data });

const unexpected = () => {
  throw new Error(
    "This test must not access the database or management services."
  );
};

export const get = unexpected;
export const run = unexpected;
export default unexpected;
