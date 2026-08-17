export default (port = 3000) => ({
  "/api": {
    target: `http://localhost:${port}`,
    xfwd: true
  }
});
