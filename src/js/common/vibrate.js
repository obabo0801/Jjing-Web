import patterns from "#common/pattern";

let timer;
let tracks = [];

function values(value) {
  if (typeof value === "string") {
    const pattern = patterns[value] || [];

    return pattern.flatMap(([, duration, gap]) => [duration, gap]).slice(0, -1);
  }

  const pattern = Array.isArray(value) ? value : [value];

  return pattern.map((duration) => {
    const number = Number(duration);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.round(number));
  });
}

function windows(track, now) {
  const result = [];
  let start = track.start;

  track.pattern.forEach((duration, index) => {
    const end = start + duration;

    if (index % 2 === 0 && end > now) {
      result.push([Math.max(start, now), end]);
    }

    start = end;
  });

  return result;
}

function merge(items) {
  const result = [];

  items.sort((a, b) => a[0] - b[0]);

  for (const item of items) {
    const last = result.at(-1);

    if (last && item[0] <= last[1]) {
      last[1] = Math.max(last[1], item[1]);
      continue;
    }

    result.push([...item]);
  }

  return result;
}

function render() {
  const now = performance.now();

  tracks = tracks.filter(({ end }) => end > now);

  const items = tracks.flatMap((track) => windows(track, now));

  const pattern = [];
  let cursor = now;

  for (const [start, end] of merge(items)) {
    const gap = Math.max(0, start - cursor);

    if (!pattern.length && gap) {
      pattern.push(0);
    }

    if (gap) {
      pattern.push(gap);
    }

    pattern.push(end - start);
    cursor = end;
  }

  navigator.vibrate(
    pattern.map((duration) => Math.max(0, Math.round(duration)))
  );

  clearTimeout(timer);

  if (!tracks.length) {
    return;
  }

  const end = Math.max(...tracks.map((track) => track.end));

  timer = setTimeout(() => {
    tracks = [];
  }, end - now);
}

export function play(value = 50) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return false;
  }

  const pattern = values(value);

  if (!pattern.some(Boolean)) {
    return false;
  }

  const start = performance.now();
  const length = pattern.reduce((total, duration) => total + duration, 0);

  tracks.push({ pattern, start, end: start + length });

  render();

  return true;
}

export function stop() {
  tracks = [];

  clearTimeout(timer);

  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return false;
  }

  return navigator.vibrate(0);
}

const methods = Object.fromEntries(
  Object.keys(patterns).map((name) => [name, () => play(name)])
);

export default Object.freeze({ play, stop, ...methods });
