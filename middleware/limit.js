export default function limit(max, time = 60_000) {
  const items = new Map();

  return (key) => {
    const now = Date.now();
    const item = items.get(key);

    if (!item || item.end <= now) {
      if (items.size >= 1024) {
        for (const [id, value] of items) {
          if (value.end <= now) {
            items.delete(id);
          }
        }
      }

      if (items.size >= 1024) {
        return false;
      }

      items.set(key, {
        count: 1,
        end: now + time
      });

      return true;
    }

    item.count += 1;

    return item.count <= max;
  };
}
