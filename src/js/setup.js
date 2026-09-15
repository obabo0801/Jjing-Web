import * as profile from "#common/profile";

export default async function setup(ready) {
  const result = await profile.read("me", { fresh: true });

  if (!result.ok) {
    return false;
  }

  ready?.();
  return true;
}
