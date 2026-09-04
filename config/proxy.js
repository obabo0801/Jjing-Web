export default (port = 3000) => {
  const target = `http://localhost:${port}`;

  return {
    "/api": { target, xfwd: true },
    "/upload": { target, xfwd: true }
  };
};
