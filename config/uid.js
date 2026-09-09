export const key = "7f4a9c2e";

export default (req) => {
  const value = req.signedCookies?.[key];

  return typeof value === "string" ? value : "";
};
