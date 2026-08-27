import * as dom from "#common/dom";

export const close = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const microphone = (deviceId) =>
  navigator.mediaDevices.getUserMedia({
    audio: deviceId
      ? { deviceId: { exact: deviceId } }
      : true
  });

export const record = (stream) => {
  const chunks = [];
  const recorder = new MediaRecorder(stream);

  const done = new Promise((resolve) => {
    dom.on(recorder, "dataavailable", (event) => {
      if (event.data.size) {
        chunks.push(event.data);
      }
    });

    dom.on(
      recorder,
      "stop",
      () => {
        resolve(
          new Blob(chunks, {
            type: recorder.mimeType || "audio/webm"
          })
        );
      },
      { once: true }
    );
  });

  recorder.start();

  return { recorder, done };
};

export const permission = async () => {
  try {
    return await navigator.permissions?.query({
      name: "microphone"
    });
  } catch {
    return null;
  }
};

export const authorize = async (deviceId, signal, stop) => {
  try {
    const stream = await microphone(deviceId);

    close(stream);

    return !signal.aborted && !stop.aborted;
  } catch {
    return false;
  }
};

export const microphones = async () => {
  const stream = await microphone();

  close(stream);

  const devices =
    await navigator.mediaDevices.enumerateDevices();

  return devices
    .filter((device) => device.kind === "audioinput")
    .map((device) => ({
      id: device.deviceId,
      name: device.label
    }));
};
