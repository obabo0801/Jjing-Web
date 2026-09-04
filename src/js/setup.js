import * as profile from "#common/profile";
import editor from "#common/profile/editor";

export default async function setup(ready) {
  const result = await profile.read("me", { fresh: true });

  if (!result.ok) {
    return false;
  }

  const user = result.data;

  if (user.setup) {
    ready?.();
    return true;
  }

  return editor(user, ready);
}
