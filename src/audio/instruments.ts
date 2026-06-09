export type Instrument = {
  id: string;
  name: string;
  icon: string;
  type: "standard" | "tab" | "both";
  /** Afinación de las cuerdas para tablatura (MIDI numbers, de grave a agudo) */
  strings?: number[];
  /** Nombre de las cuerdas */
  stringNames?: string[];
  /** Clef para notación estándar */
  clef: "treble" | "bass" | "alto" | "tenor" | "percussion";
  /** Transposición en semitonos */
  transpose: number;
};

export const INSTRUMENTS: Instrument[] = [
  {
    id: "piano",
    name: "Piano",
    icon: "🎹",
    type: "standard",
    clef: "treble",
    transpose: 0,
  },
  {
    id: "guitar",
    name: "Guitarra",
    icon: "🎸",
    type: "both",
    strings: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    stringNames: ["E", "A", "D", "G", "B", "e"],
    clef: "treble",
    transpose: -12,
  },
  {
    id: "bass",
    name: "Bajo",
    icon: "🎸",
    type: "both",
    strings: [28, 33, 38, 43], // E1 A1 D2 G2
    stringNames: ["E", "A", "D", "G"],
    clef: "bass",
    transpose: -12,
  },
  {
    id: "violin",
    name: "Violín",
    icon: "🎻",
    type: "standard",
    clef: "treble",
    transpose: 0,
  },
  {
    id: "cello",
    name: "Violonchelo",
    icon: "🎻",
    type: "standard",
    clef: "bass",
    transpose: 0,
  },
  {
    id: "flute",
    name: "Flauta",
    icon: "🎵",
    type: "standard",
    clef: "treble",
    transpose: 0,
  },
  {
    id: "saxophone",
    name: "Saxofón",
    icon: "🎷",
    type: "standard",
    clef: "treble",
    transpose: 0,
  },
  {
    id: "trumpet",
    name: "Trompeta",
    icon: "🎺",
    type: "standard",
    clef: "treble",
    transpose: 0,
  },
];

/**
 * Convierte un número MIDI a cuerda y traste para tablatura.
 * 
 * VexFlow dibuja str=0 en la línea SUPERIOR de la tablatura,
 * que corresponde a la cuerda MÁS AGUDA.
 * 
 * Nuestro array `strings` va de GRAVE (índice 0) a AGUDO (índice N-1).
 * Por lo tanto, para VexFlow: str = (N-1) - bestIdx
 * 
 * Ejemplo guitarra [E2=40, A2=45, D3=50, G3=55, B3=59, E4=64]:
 *   - E4 (aguda, idx 5) → str = 5-5 = 0 → línea superior ✓
 *   - E2 (grave, idx 0) → str = 5-0 = 5 → línea inferior ✓
 */
export function midiToTabPosition(
  midiNumber: number,
  strings: number[]
): { str: number; fret: number } | null {
  if (strings.length === 0) return null;

  const numStrings = strings.length;

  // Buscar la cuerda con el traste más cercano (>=0 y <=24)
  let bestIdx = -1;
  let bestFret = 99;

  for (let i = 0; i < numStrings; i++) {
    const fret = midiNumber - strings[i];
    if (fret >= 0 && fret <= 24 && fret < bestFret) {
      bestIdx = i;
      bestFret = fret;
    }
  }

  // Si no se encontró un traste válido (nota fuera del rango del instrumento)
  if (bestIdx === -1) {
    // Nota más grave que la cuerda más grave: usar cuerda más grave (índice 0)
    if (midiNumber < strings[0]) {
      bestIdx = 0;
      bestFret = midiNumber - strings[0]; // será negativo, se usará 0
    }
    // Nota más aguda que la cuerda más aguda: usar cuerda más aguda (índice N-1)
    else if (midiNumber > strings[numStrings - 1]) {
      bestIdx = numStrings - 1;
      bestFret = midiNumber - strings[numStrings - 1];
    }
    // Si está entre cuerdas pero no en traste válido (>24), usar la cuerda más grave
    else {
      bestIdx = 0;
      bestFret = Math.min(midiNumber - strings[0], 24);
    }
  }

  // Asegurar traste no negativo
  if (bestFret < 0) bestFret = 0;
  if (bestFret > 24) bestFret = 24;

  // Invertir índice para VexFlow: 0 = cuerda más aguda (última del array)
  const vexStr = numStrings - 1 - bestIdx;

  return { str: vexStr, fret: bestFret };
}