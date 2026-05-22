const A4 = 440;

const notes = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export function frequencyToNote(
  frequency: number
) {

  // número MIDI
  const noteNumber =
    69 +
    12 *
      Math.log2(
        frequency / A4
      );

  const rounded =
    Math.round(noteNumber);

  const noteIndex =
    ((rounded % 12) + 12) % 12;

  const octave =
    Math.floor(rounded / 12) - 1;

  // frecuencia ideal de la nota
  const idealFrequency =
    A4 *
    Math.pow(
      2,
      (rounded - 69) / 12
    );

  // diferencia en cents
  const cents =
    1200 *
    Math.log2(
      frequency /
      idealFrequency
    );

  return {
    note:
      notes[noteIndex] + octave,

    cents:
      Math.round(cents),

    idealFrequency,
  };
}