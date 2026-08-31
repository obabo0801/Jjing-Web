import speech from "@google-cloud/speech";

const { SpeechClient } = speech.v2;
const mode = (process.env.STT || "").trim().toLowerCase();
const keyFile =
  process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

export const enabled = ["login", "json"].includes(mode);

let client;
let project;
const connect = () => {
  if (mode === "json") {
    if (!keyFile) {
      throw new Error();
    }

    return new SpeechClient({ keyFilename: keyFile });
  }

  return new SpeechClient();
};

export default async function recognize(audio, lang) {
  if (
    !enabled ||
    !Buffer.isBuffer(audio) ||
    !audio.length
  ) {
    return { text: "", confidence: null };
  }

  client ||= connect();
  project ||= await client.getProjectId();

  const [response] = await client.recognize({
    recognizer:
      `projects/${project}/locations/global/` +
      "recognizers/_",
    config: {
      autoDecodingConfig: {},
      languageCodes: [lang],
      model: "short"
    },
    content: audio
  });
  const items = (response.results || [])
    .map((result) => result.alternatives?.[0])
    .filter(Boolean);
  const text = items
    .map((item) => item.transcript?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  const scores = items
    .map((item) => Number(item.confidence))
    .filter((value) => value > 0);
  const confidence = scores.length
    ? scores.reduce((sum, value) => sum + value, 0) /
      scores.length
    : null;

  return { text, confidence };
}
