const A4 = 440;

const notes = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

// Rango seguro para VexFlow en clave de Sol: C4 (do central) a C6
// En clave de Fa: C2 a C5
const MIN_OCTAVE = 3;
const MAX_OCTAVE = 6;

export function frequencyToNote(frequency: number) {
  const noteNumber = 69 + 12 * Math.log2(frequency / A4);
  const rounded = Math.round(noteNumber);

  const noteIndex = ((rounded % 12) + 12) % 12;

  let octave = Math.floor(rounded / 12) - 1;

  // Clampear a rango donde VexFlow pueda dibujar bien las notas
  if (octave < MIN_OCTAVE) octave = MIN_OCTAVE;
  if (octave > MAX_OCTAVE) octave = MAX_OCTAVE;

  const idealFrequency = A4 * Math.pow(2, (rounded - 69) / 12);
  const cents = 1200 * Math.log2(frequency / idealFrequency);

  const noteName = notes[noteIndex] + octave;

  return {
    note: noteName,
    cents: Math.round(cents),
    idealFrequency,
    midiNumber: (octave + 1) * 12 + noteIndex,
  };
}