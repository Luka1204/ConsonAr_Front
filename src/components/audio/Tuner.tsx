import {
  useRef,
  useState,
} from "react";

import {
  getAudioStream,
} from "../../audio/audioCapture";

import {
  createPitchDetector,
} from "../../audio/pitchDetector";

import {
  frequencyToNote,
} from "../../audio/noteMapper";

function getRMS(
  buffer: Float32Array
) {

  let sum = 0;

  for (
    let i = 0;
    i < buffer.length;
    i++
  ) {

    sum +=
      buffer[i] * buffer[i];
  }

  return Math.sqrt(
    sum / buffer.length
  );
}

export default function Tuner() {

  const [note, setNote] =
    useState("-");

  const [frequency,
    setFrequency] =
    useState(0);

  const [cents, setCents] =
    useState(0);

  const lastNote =
    useRef("");

  const lastFrequency =
    useRef(0);

  const frequencyHistory =
    useRef<number[]>([]);

  const stableNotes =
    useRef<string[]>([]);

  const isRunning =
    useRef(false);

  const startTuner =
    async () => {

    // evitar múltiples loops
    if (isRunning.current)
      return;

    isRunning.current =
      true;

    const {
      audioContext,
      source,
    } =
      await getAudioStream();

    const analyser =
      audioContext.createAnalyser();

    // balance precisión / latencia
    analyser.fftSize = 4096;

    source.connect(analyser);

    const buffer =
      new Float32Array(
        analyser.fftSize
      );

    const detectPitch =
      createPitchDetector(
        audioContext.sampleRate
      );

    const update = () => {

      analyser.getFloatTimeDomainData(
        buffer
      );

      // volumen RMS
      const volume =
        getRMS(buffer);

      // noise gate
      if (volume > 0.005) {

        const pitch =
          detectPitch(buffer);

        if (
          pitch &&
          pitch > 70 &&
          pitch < 1200
        ) {

          // evitar saltos bruscos
          if (
            lastFrequency.current !==
              0 &&
            Math.abs(
              pitch -
              lastFrequency.current
            ) > 100
          ) {

            requestAnimationFrame(
              update
            );

            return;
          }

          lastFrequency.current =
            pitch;

          // smoothing frecuencias
          frequencyHistory.current.push(
            pitch
          );

          // mantener últimas muestras
          if (
            frequencyHistory.current
              .length > 8
          ) {

            frequencyHistory.current.shift();
          }

          // promedio frecuencia
          const averagePitch =
            frequencyHistory.current.reduce(
              (a, b) => a + b,
              0
            ) /
            frequencyHistory.current
              .length;

          setFrequency(
            averagePitch
          );

          // detectar nota
          const detected =
            frequencyToNote(
              averagePitch
            );

          const detectedNote =
            detected.note;

          // guardar cents
          setCents(
            detected.cents
          );

          // estabilidad temporal
          stableNotes.current.push(
            detectedNote
          );

          if (
            stableNotes.current
              .length > 3
          ) {

            stableNotes.current.shift();
          }

          // verificar estabilidad
          const allEqual =
            stableNotes.current.every(
              (
                note
              ) =>
                note ===
                detectedNote
            );

          if (
            allEqual &&
            detectedNote !==
              lastNote.current
          ) {

            lastNote.current =
              detectedNote;

            setNote(
              detectedNote
            );
          }
        }
      }

      requestAnimationFrame(
        update
      );
    };

    update();
  };

  return (
    <div>

      <h2>
        Afinador
      </h2>

      <p>
        Nota:
        {" "}
        <strong>
          {note}
        </strong>
      </p>

      <p>
        Frecuencia:
        {" "}
        {frequency.toFixed(2)}
        {" "}
        Hz
      </p>

      <p>
        Desviación:
        {" "}
        {cents}
        {" "}
        cents
      </p>

      <button
        onClick={startTuner}
      >
        Iniciar
      </button>

    </div>
  );
}