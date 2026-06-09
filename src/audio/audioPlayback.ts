import type { RecordedNote } from "./noteRecorder";

export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private onFinish?: () => void;

  constructor(onFinish?: () => void) {
    this.onFinish = onFinish;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  async play(notes: RecordedNote[]): Promise<void> {
    if (notes.length === 0 || this.isPlaying) return;

    this.isPlaying = true;
    this.audioContext = new AudioContext();

    const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);
    const firstTime = sorted[0].startTime;
    const now = this.audioContext.currentTime;

    for (const n of sorted) {
      const offsetMs = n.startTime - firstTime;
      const startTime = now + offsetMs / 1000;
      const endTime = startTime + n.duration / 1000;
      this.scheduleNote(this.audioContext, n.frequency, startTime, endTime);
    }

    // Calcular cuándo termina la última nota
    const last = sorted[sorted.length - 1];
    const lastEndMs = (last.startTime - firstTime) + last.duration;
    const totalDuration = lastEndMs / 1000;

    setTimeout(() => {
      this.isPlaying = false;
      this.onFinish?.();
      this.audioContext?.close();
      this.audioContext = null;
    }, totalDuration * 1000 + 300);
  }

  stop() {
    this.isPlaying = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private scheduleNote(ctx: AudioContext, frequency: number, startTime: number, endTime: number) {
    if (frequency <= 0) return;
    const duration = endTime - startTime;
    if (duration <= 0) return;

    // Oscilador principal - onda triangular para sonido más musical
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, startTime);

    // Oscilador armónico (octava arriba)
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(frequency * 2, startTime);

    // Envolvente ADSR
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01); // attack
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.08); // decay
    gain.gain.setValueAtTime(0.2, endTime - 0.05);
    gain.gain.linearRampToValueAtTime(0, endTime); // release

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.08, startTime + 0.01);
    gain2.gain.linearRampToValueAtTime(0.04, startTime + 0.08);
    gain2.gain.setValueAtTime(0.04, endTime - 0.05);
    gain2.gain.linearRampToValueAtTime(0, endTime);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(endTime);
    osc2.start(startTime);
    osc2.stop(endTime);
  }
}