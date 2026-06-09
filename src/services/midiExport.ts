import type { RecordedNote } from "../audio/noteRecorder";

/**
 * Genera un archivo MIDI a partir de las notas grabadas
 * usando el formato MIDI estándar Type 1.
 */
export function generateMidiFile(notes: RecordedNote[]): Blob {
  const data = generateSingleTrackMidi(notes);
  return new Blob([data.buffer as ArrayBuffer], { type: "audio/midi" });
}

function generateSingleTrackMidi(notes: RecordedNote[]): Uint8Array {
  const ticksPerQuarter = 480;
  const tempoMicroPerQuarter = 500000; // 120 BPM

  if (notes.length === 0) {
    // Track vacío con solo fin
    const header = buildHeader(1, ticksPerQuarter);
    const track = buildTempoTrack(tempoMicroPerQuarter);
    return concatArrays(header, track);
  }

  // Ordenar
  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);
  const firstTime = sorted[0].startTime;

  // Calcular msPerTick
  const msPerTick = tempoMicroPerQuarter / 1000 / ticksPerQuarter;

  // Construir eventos
  const events: Uint8Array[] = [];

  // 1. Set tempo
  events.push(buildMetaEvent(0, 0x51, [tempoMicroPerQuarter >> 16, tempoMicroPerQuarter >> 8, tempoMicroPerQuarter]));

  let lastTick = 0;

  for (const n of sorted) {
    const startTick = Math.max(0, Math.round((n.startTime - firstTime) / msPerTick));
    const durationTicks = Math.max(1, Math.round(n.duration / msPerTick));

    // Delta desde el último evento
    const delta = startTick - lastTick;
    lastTick = startTick;

    // Note On
    events.push(buildShortEvent(delta, 0x90, n.midiNumber, 100));

    // Note Off después de durationTicks
    events.push(buildShortEvent(durationTicks, 0x80, n.midiNumber, 0));

    lastTick += durationTicks;
  }

  // End of track
  events.push(buildMetaEvent(0, 0x2f, []));

  // Concatenar todos los eventos en un solo chunk de datos
  const trackData = concatArrays(...events);
  const trackChunk = buildTrackChunk(trackData);
  const header = buildHeader(1, ticksPerQuarter);

  return concatArrays(header, trackChunk);
}

function buildHeader(ntracks: number, division: number): Uint8Array {
  const buf = new Uint8Array(14);
  buf[0] = 0x4d; buf[1] = 0x54; buf[2] = 0x68; buf[3] = 0x64; // "MThd"
  writeUint32(buf, 4, 6);  // chunk length
  writeUint16(buf, 8, 1);  // format 1
  writeUint16(buf, 10, ntracks);
  writeUint16(buf, 12, division);
  return buf;
}

function buildTrackChunk(data: Uint8Array): Uint8Array {
  const buf = new Uint8Array(8 + data.length);
  buf[0] = 0x4d; buf[1] = 0x54; buf[2] = 0x72; buf[3] = 0x6b; // "MTrk"
  writeUint32(buf, 4, data.length);
  buf.set(data, 8);
  return buf;
}

function buildTempoTrack(tempoMicro: number): Uint8Array {
  const events: Uint8Array[] = [];
  // Set tempo
  events.push(buildMetaEvent(0, 0x51, [
    (tempoMicro >> 16) & 0xff,
    (tempoMicro >> 8) & 0xff,
    tempoMicro & 0xff,
  ]));
  // Track end
  events.push(buildMetaEvent(0, 0x2f, []));

  const data = concatArrays(...events);
  return buildTrackChunk(data);
}

/** Construye un evento MIDI de canal (delta + status + data1 + data2) */
function buildShortEvent(delta: number, status: number, data1: number, data2: number): Uint8Array {
  const deltaBytes = encodeVarLen(delta);
  const buf = new Uint8Array(deltaBytes.length + 3);
  buf.set(deltaBytes, 0);
  buf[deltaBytes.length] = status;
  buf[deltaBytes.length + 1] = data1;
  buf[deltaBytes.length + 2] = data2;
  return buf;
}

/** Construye un evento meta MIDI (delta + 0xff + type + length + data) */
function buildMetaEvent(delta: number, type: number, data: number[]): Uint8Array {
  const deltaBytes = encodeVarLen(delta);
  const buf = new Uint8Array(deltaBytes.length + 2 + 1 + data.length);
  let offset = 0;
  buf.set(deltaBytes, offset);
  offset += deltaBytes.length;
  buf[offset++] = 0xff;
  buf[offset++] = type;
  buf[offset++] = data.length;
  for (let i = 0; i < data.length; i++) {
    buf[offset++] = data[i];
  }
  return buf;
}

function encodeVarLen(value: number): Uint8Array {
  if (value < 0) value = 0;
  // Caso especial value=0
  if (value === 0) {
    return new Uint8Array([0]);
  }
  const buf = new Uint8Array(4);
  let i = 0;
  // Escribir de derecha a izquierda
  buf[i++] = value & 0x7f;
  value >>= 7;
  while (value > 0) {
    buf[i++] = (value & 0x7f) | 0x80;
    value >>= 7;
  }
  // Invertir
  const result = new Uint8Array(i);
  for (let j = 0; j < i; j++) {
    result[j] = buf[i - 1 - j];
  }
  return result;
}

function writeUint16(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = (value >> 8) & 0xff;
  buf[offset + 1] = value & 0xff;
}

function writeUint32(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = (value >> 24) & 0xff;
  buf[offset + 1] = (value >> 16) & 0xff;
  buf[offset + 2] = (value >> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

function concatArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function downloadMidi(notes: RecordedNote[], filename: string = "grabacion.mid") {
  const blob = generateMidiFile(notes);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}