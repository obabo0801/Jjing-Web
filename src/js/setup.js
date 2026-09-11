import * as profile from "#common/profile";
import editor from "#common/profile/editor";

export default async function setup(ready) {
  const result = await profile.read("me", { fresh: true });

  if (!result.ok) {
    return false;
  }

  if (result.data.setup) {
    ready?.();
    return true;
  }

  return editor(result.data, ready);
}
