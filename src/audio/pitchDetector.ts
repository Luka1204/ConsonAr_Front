import { YIN } from "pitchfinder";

export function createPitchDetector(
  sampleRate: number
) {

  return YIN({

    sampleRate,

    minFrequency: 70,

    maxFrequency: 1200,

    threshold: 0.2,
  });
}