import { YIN } from "pitchfinder";
import { frequencyToNote } from "./noteMapper";
import type { RecordedNote } from "./noteRecorder";

const YIN_typed = YIN as unknown as (config: Record<string, unknown>) => (buffer: Float32Array) => number | null;

/**
 * Corrige octavas erróneas comunes de YIN.
 * YIN a menudo detecta una octava abajo de la real.
 */
function correctOctave(freq: number): number {
  // Notas en el rango 65-130 Hz probablemente deberían ser 130-260
  if (freq >= 65 && freq < 130) return freq * 2;
  // Notas muy bajas (<65 Hz) no son comunes en melodías, multiplicar
  if (freq >= 30 && freq < 65) return freq * 4;
  return freq;
}

/**
 * Analiza un archivo de audio decodificado y extrae las notas musicales.
 */
export async function analyzeAudioFile(file: File): Promise<{
  notes: RecordedNote[];
  sampleRate: number;
  durationMs: number;
}> {
  const audioBuffer = await decodeAudioFile(file);
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const durationMs = (channelData.length / sampleRate) * 1000;

  const detectPitch = YIN_typed({
    sampleRate,
    minFrequency: 80,
    maxFrequency: 1200,
    threshold: 0.12,
  });

  const windowSize = 4096;
  const hopSize = Math.floor(windowSize / 3);
  const baseTime = Date.now();
  const rawFrames: { timeMs: number; freq: number; noteName: string; midi: number }[] = [];

  let stableNote = "";
  let stableCount = 0;

  for (let i = 0; i + windowSize < channelData.length; i += hopSize) {
    const frame = channelData.slice(i, i + windowSize);
    const timeMs = (i / sampleRate) * 1000;

    // RMS
    let rms = 0;
    for (let j = 0; j < frame.length; j++) rms += frame[j] * frame[j];
    rms = Math.sqrt(rms / frame.length);

    if (rms > 0.008) {
      let pitch = detectPitch(frame);
      if (pitch && pitch > 30 && pitch < 1500) {
        // Corregir octava
        pitch = correctOctave(pitch);
        // Re-verificar rango después de corrección
        if (pitch < 80 || pitch > 1200) continue;

        const detected = frequencyToNote(pitch);
        const noteName = detected.note;

        // Requerir 4 frames consecutivos de la misma nota para estabilidad
        if (noteName === stableNote) {
          stableCount++;
        } else {
          stableNote = noteName;
          stableCount = 1;
        }

        if (stableCount >= 4) {
          rawFrames.push({
            timeMs,
            freq: pitch,
            noteName,
            midi: detected.midiNumber,
          });
        }
      } else {
        stableNote = "";
        stableCount = 0;
      }
    } else {
      stableNote = "";
      stableCount = 0;
    }
  }

  // Agrupar frames consecutivos en notas
  const grouped: { noteName: string; midi: number; freq: number; startMs: number; endMs: number }[] = [];

  if (rawFrames.length === 0) {
    return { notes: [], sampleRate, durationMs };
  }

  let g = {
    noteName: rawFrames[0].noteName,
    midi: rawFrames[0].midi,
    freq: rawFrames[0].freq,
    startMs: rawFrames[0].timeMs,
    endMs: rawFrames[0].timeMs,
    count: 1,
  };

  for (let i = 1; i < rawFrames.length; i++) {
    const f = rawFrames[i];
    if (f.noteName !== g.noteName || (f.timeMs - rawFrames[i - 1].timeMs) > 400) {
      const dur = g.endMs - g.startMs;
      if (dur >= 100) {
        grouped.push({ noteName: g.noteName, midi: g.midi, freq: g.freq, startMs: g.startMs, endMs: g.endMs });
      }
      g = { noteName: f.noteName, midi: f.midi, freq: f.freq, startMs: f.timeMs, endMs: f.timeMs, count: 1 };
    } else {
      g.endMs = f.timeMs;
      g.count++;
      g.freq = (g.freq * (g.count - 1) + f.freq) / g.count;
    }
  }
  const lastDur = g.endMs - g.startMs;
  if (lastDur >= 100) {
    grouped.push({ noteName: g.noteName, midi: g.midi, freq: g.freq, startMs: g.startMs, endMs: g.endMs });
  }

  // Convertir a RecordedNote
  const notes: RecordedNote[] = grouped.map((g) => ({
    note: g.noteName,
    midiNumber: g.midi,
    frequency: Math.round(g.freq * 10) / 10,
    startTime: baseTime + g.startMs,
    endTime: baseTime + g.endMs,
    duration: g.endMs - g.startMs,
  }));

  // Limitar a max 100 notas
  let finalNotes = notes;
  if (notes.length > 100) {
    const step = Math.ceil(notes.length / 100);
    finalNotes = notes.filter((_, i) => i % step === 0);
  }

  // Normalizar timestamps
  if (finalNotes.length > 0) {
    const first = finalNotes[0].startTime;
    for (const n of finalNotes) {
      n.startTime -= first;
      n.endTime -= first;
    }
  }

  console.log(`AudioAnalyzer: ${rawFrames.length} frames → ${grouped.length} grupos → ${finalNotes.length} notas`);

  return { notes: finalNotes, sampleRate, durationMs };
}

async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  await audioContext.close();
  return audioBuffer;
}

export function getSupportedAudioFormats(): string[] {
  const audio = document.createElement("audio");
  const formats: string[] = [];
  if (audio.canPlayType("audio/mpeg") !== "") formats.push(".mp3");
  if (audio.canPlayType("audio/wav") !== "") formats.push(".wav");
  if (audio.canPlayType("audio/ogg") !== "") formats.push(".ogg");
  if (audio.canPlayType("audio/flac") !== "") formats.push(".flac");
  if (audio.canPlayType("audio/aac") !== "") formats.push(".aac");
  if (audio.canPlayType("audio/m4a") !== "") formats.push(".m4a");
  if (formats.length === 0) formats.push(".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a");
  return formats;
}