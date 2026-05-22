export async function getAudioStream() {

  const stream =
    await navigator.mediaDevices
      .getUserMedia({

        audio: {

          echoCancellation: false,

          noiseSuppression: false,

          autoGainControl: false,
        },
      });

  const audioContext =
    new AudioContext();

  const source =
    audioContext
      .createMediaStreamSource(
        stream
      );

  return {
    audioContext,
    source,
  };
}