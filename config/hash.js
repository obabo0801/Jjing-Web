import { createHash } from "node:crypto";

export default function hash(length, ...values) {
  const result = createHash("sha256");

  values.forEach((value) => {
    result.update(value);
  });

  return result.digest("hex").slice(0, length);
}
