import { get } from "#common/storage";

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
  const fallback = name === "master" ? get("volume", 100) : 100;
  const value = Number(get(`volume-${name}`, fallback));

  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) / 100 : 1;
};

export function level(channel, value = 1) {
  const master = percent("master");
  const current = percent(channel);

  return Math.min(1, Math.max(0, value * master * current));
}
