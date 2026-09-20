import { run } from "#db";

export default async function record(uid, ...files) {
  if (!uid) return;

  for (const file of new Set(files)) {
    await run("INSERT OR IGNORE INTO upload (file, uid) VALUES (?, ?)", [file, uid]);
  }
}
