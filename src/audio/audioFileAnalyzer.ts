import { YIN } from "pitchfinder";
import { frequencyToNote } from "./noteMapper";
import type { RecordedNote } from "./noteRecorder";

const YIN_typed = YIN as unknown as (config: Record<string, unknown>) => (buffer: Float32Array) => number | null;

/**
 * Analiza un archivo de audio usando YIN con configuración mejorada.
 * Incluye mejor detección de octavas y estabilidad de notas.
 */
export async function analyzeAudioFile(
  file: File,
  onProgress?: (percent: number, message: string) => void
): Promise<{
  notes: RecordedNote[];
  sampleRate: number;
  durationMs: number;
}> {
  const audioBuffer = await decodeAudioFile(file);
  const sampleRate = audioBuffer.sampleRate;
  const ch = audioBuffer.getChannelData(0);

  // Análisis en el main thread con reportes de progreso
  return analyzeAudioDataOptimized(ch, sampleRate, onProgress);
}

/**
 * Análisis optimizado con mejor detección de notas
 */
export function analyzeAudioDataOptimized(
  ch: Float32Array,
  sampleRate: number,
  onProgress?: (percent: number, message: string) => void
): { notes: RecordedNote[]; sampleRate: number; durationMs: number } {
  const durationMs = (ch.length / sampleRate) * 1000;
  const baseTime = Date.now();

  const detectPitch = YIN_typed({
    sampleRate,
    minFrequency: 50,  // Detectar notas bajas
    maxFrequency: 800, // Permitir notas más agudas
    threshold: 0.1,  // Menos sensible al ruido
  });

  const hopSize = Math.floor(sampleRate * 0.015); // ~15ms
  const windowSize = 2048;
  const rawNotes: { t: number; note: string; midi: number; confidence: number }[] = [];

  let stableNote = "";
  let stableCount = 0;
  let lastValidPitch = 0;
  const totalFrames = Math.floor((ch.length - windowSize) / hopSize);
  let processedFrames = 0;

  for (let pos = 0; pos + windowSize < ch.length; pos += hopSize) {
    processedFrames++;

    // Reportar progreso
    if (processedFrames % 50 === 0 && onProgress) {
      const percent = Math.floor((processedFrames / totalFrames) * 100);
      onProgress(percent, `Procesando... ${percent}%`);
    }

    const t = (pos / sampleRate) * 1000;
    const frame = ch.slice(pos, pos + windowSize);

    // Calcular RMS y amplitud máxima
    let rms = 0;
    let maxAmp = 0;
    for (let j = 0; j < frame.length; j++) {
      const val = Math.abs(frame[j]);
      rms += frame[j] * frame[j];
      maxAmp = Math.max(maxAmp, val);
    }
    rms = Math.sqrt(rms / frame.length);

    // Threshold dinámico muy bajo para capturar más notas
    if (rms < 0.0001 || maxAmp < 0.0002) {
      stableNote = "";
      stableCount = 0;
      continue;
    }

    const pitch = detectPitch(frame);
    if (!pitch) {
      stableNote = "";
      stableCount = 0;
      continue;
    }

    // Corrector de octava mejorado
    let correctedPitch = correctOctave(pitch);
    // Rango más amplio: desde E2 (82 Hz) hasta notas altas
    if (correctedPitch < 50 || correctedPitch > 800) continue;

    // Validar cambios de frecuencia no erráticos
    if (lastValidPitch > 0) {
      const ratio = correctedPitch / lastValidPitch;
      // Permitir cambios más naturales (saltos de octava)
      if (ratio > 2.0 || ratio < 0.5) {
        stableNote = "";
        stableCount = 0;
        continue;
      }
    }
    lastValidPitch = correctedPitch;

    const d = frequencyToNote(correctedPitch);
    const confidence = rms / (maxAmp + 0.0001);

    // Estabilidad de notas
    if (d.note === stableNote) {
      stableCount++;
    } else {
      stableNote = d.note;
      stableCount = 1;
    }

    if (stableCount >= 1) {
      rawNotes.push({ t, note: d.note, midi: d.midiNumber, confidence });
    }
  }

  // Agrupar notas consecutivas
  const grouped: { note: string; midi: number; start: number; end: number }[] = [];
  if (rawNotes.length === 0) {
    return { notes: [], sampleRate, durationMs };
  }

  let grp = {
    note: rawNotes[0].note,
    midi: rawNotes[0].midi,
    start: rawNotes[0].t,
    end: rawNotes[0].t,
  };

  for (let i = 1; i < rawNotes.length; i++) {
    const r = rawNotes[i];
    const gap = r.t - rawNotes[i - 1].t;

    if (r.note !== grp.note || gap > 100) {
      const dur = grp.end - grp.start;
      if (dur >= 20) {
        grouped.push({ note: grp.note, midi: grp.midi, start: grp.start, end: grp.end });
      }
      grp = { note: r.note, midi: r.midi, start: r.t, end: r.t };
    } else {
      grp.end = r.t;
    }
  }

  const ld = grp.end - grp.start;
  if (ld >= 20) {
    grouped.push({ note: grp.note, midi: grp.midi, start: grp.start, end: grp.end });
  }

  // Crear notas finales
  const notes: RecordedNote[] = grouped.map((g) => ({
    note: g.note,
    midiNumber: g.midi,
    frequency: 440 * Math.pow(2, (g.midi - 69) / 12),
    startTime: baseTime + g.start,
    endTime: baseTime + g.end,
    duration: g.end - g.start,
  }));

  notes.sort((a, b) => a.startTime - b.startTime);

  // Aumentar límite a 500 notas para mejor precisión
  const maxNotes = 500;
  const final =
    notes.length > maxNotes ? notes.filter((_, i) => i % Math.ceil(notes.length / maxNotes) === 0) : notes;

  if (final.length > 0) {
    const first = final[0].startTime;
    for (const n of final) {
      n.startTime -= first;
      n.endTime -= first;
    }
  }

  console.log(
    `AudioAnalyzer: ${rawNotes.length} frames → ${grouped.length} grupos → ${final.length} notas`
  );
  return { notes: final, sampleRate, durationMs };
}

/**
 * Corrige errores de detección de octava
 */
function correctOctave(pitch: number): number {
  let correctedPitch = pitch;

  // Si la frecuencia es demasiado baja, intentar octavas arriba
  if (pitch < 80) {
    while (correctedPitch < 80 && correctedPitch * 2 <= 2000) {
      correctedPitch *= 2;
    }
  }

  // Si la frecuencia es demasiado alta, intentar octavas abajo
  if (pitch > 1500) {
    while (correctedPitch > 1500 && correctedPitch / 2 >= 50) {
      correctedPitch /= 2;
    }
  }

  return correctedPitch;
}

async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const buf = await file.arrayBuffer();
  const ac = new AudioContext();
  const ab = await ac.decodeAudioData(buf);
  await ac.close();
  return ab;
}

export function getSupportedAudioFormats(): string[] {
  const a = document.createElement("audio");
  const f: string[] = [];
  if (a.canPlayType("audio/mpeg") !== "") f.push(".mp3");
  if (a.canPlayType("audio/wav") !== "") f.push(".wav");
  if (a.canPlayType("audio/ogg") !== "") f.push(".ogg");
  if (a.canPlayType("audio/flac") !== "") f.push(".flac");
  if (a.canPlayType("audio/aac") !== "") f.push(".aac");
  if (a.canPlayType("audio/m4a") !== "") f.push(".m4a");
  if (f.length === 0) f.push(".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a");
  return f;
}
