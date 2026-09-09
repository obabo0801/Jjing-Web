export const state = {};

export const reset = () => {
  Object.assign(state, {
    files: new Map(),
    writes: [],
    records: [],
    requests: [],
    syntheses: [],
    recognitions: [],
    clients: [],
    projects: 0,
    closes: 0,
    dbError: null,
    readError: null,
    writeError: null,
    cloudError: null,
    speechError: null,
    initializeTask: null,
    fetchTask: null,
    audio: Buffer.from("cloud-audio"),
    results: []
  });
};

export const tts = (file = "") => `tts/${file}`;
export const stt = (file = "") => `stt/${file}`;
export const mkdirSync = () => {};
export const readFile = async (file) => {
  if (state.readError) throw state.readError;
  if (!state.files.has(file))
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  return state.files.get(file);
};

export const writeFile = async (file, audio, options) => {
  if (state.writeError) throw state.writeError;
  if (options?.flag === "wx" && state.files.has(file)) {
    throw Object.assign(new Error("exists"), { code: "EEXIST" });
  }
  state.writes.push({ file, options });
  state.files.set(file, audio);
};

export const rm = async (file) => state.files.delete(file);
export const run = async (query, params) => {
  if (state.dbError) throw state.dbError;
  state.records.push({ query, params });
  return { changes: 1 };
};

export class TextToSpeechClient {
  constructor(options) {
    state.clients.push({ type: "tts", options });
  }
  async initialize() {
    await state.initializeTask;
  }
  async synthesizeSpeech(request, options) {
    state.syntheses.push({ request, options });
    if (state.cloudError) throw state.cloudError;
    return [{ audioContent: state.audio }];
  }
  async close() {
    state.closes += 1;
  }
}

export class SpeechClient {
  constructor(options) {
    state.clients.push({ type: "stt", options });
  }
  async getProjectId() {
    state.projects += 1;
    return "test-project";
  }
  async recognize(request) {
    state.recognitions.push(request);
    if (state.speechError) throw state.speechError;
    return [{ results: state.results }];
  }
}

export const fetch = async (url, options) => {
  state.requests.push({ url: new URL(url), options });
  if (state.fetchTask) return state.fetchTask;
  return new Response("google-audio", {
    headers: { "content-type": "audio/mpeg" }
  });
};
