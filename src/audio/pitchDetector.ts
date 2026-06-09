import { YIN } from "pitchfinder";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YIN_typed = YIN as unknown as (config: Record<string, unknown>) => (buffer: Float32Array) => number | null;

export function createPitchDetector(
  sampleRate: number
) {
  return YIN_typed({
    sampleRate,
    minFrequency: 60,
    maxFrequency: 1500,
    threshold: 0.08,
  });
}