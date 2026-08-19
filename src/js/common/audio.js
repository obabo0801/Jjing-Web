import root from "#common/root";

let audio;

export function context() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return null;
  }

  audio ||= new AudioContext();

  if (audio.state === "suspended") {
    audio.resume().catch(() => {});
  }

  return audio;
}

const percent = (name) => {
  const style = getComputedStyle(root);

  const value = parseFloat(style.getPropertyValue(name));

  return Number.isFinite(value) ? value / 100 : 1;
};

export function level(channel, value = 1) {
  const master = percent("--volume-master");
  const current = percent(`--volume-${channel}`);

  return Math.min(1, Math.max(0, value * master * current));
}
