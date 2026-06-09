export type RecordedNote = {
  note: string;
  midiNumber: number;
  frequency: number;
  startTime: number;
  endTime: number;
  duration: number; // en ms
};

export class NoteRecorder {
  private notes: RecordedNote[] = [];
  private isRecording = false;
  private currentNote: Partial<RecordedNote> | null = null;
  private onNoteUpdate?: (note: string, frequency: number, cents: number) => void;
  private onRecordingEnd?: (notes: RecordedNote[]) => void;

  constructor(
    onNoteUpdate?: (note: string, frequency: number, cents: number) => void,
    onRecordingEnd?: (notes: RecordedNote[]) => void
  ) {
    this.onNoteUpdate = onNoteUpdate;
    this.onRecordingEnd = onRecordingEnd;
  }

  start() {
    this.notes = [];
    this.currentNote = null;
    this.isRecording = true;
  }

  stop(): RecordedNote[] {
    if (this.currentNote) {
      this.finishCurrentNote();
    }
    this.isRecording = false;
    if (this.onRecordingEnd) {
      this.onRecordingEnd([...this.notes]);
    }
    return [...this.notes];
  }

  reset() {
    this.notes = [];
    this.currentNote = null;
  }

  isActive(): boolean {
    return this.isRecording;
  }

  getNotes(): RecordedNote[] {
    return [...this.notes];
  }

  feedPitch(frequency: number, noteName: string, cents: number) {
    if (!this.isRecording) return;

    const now = Date.now();
    const midiNumber = this.noteNameToMidi(noteName);

    if (this.onNoteUpdate) {
      this.onNoteUpdate(noteName, frequency, cents);
    }

    // Si hay una nota actual y es la misma, actualizar endTime
    if (this.currentNote && this.currentNote.note === noteName) {
      this.currentNote.endTime = now;
      this.currentNote.duration = now - this.currentNote.startTime!;
      return;
    }

    // Finalizar nota actual si existe y es diferente
    if (this.currentNote) {
      this.finishCurrentNote();
    }

    // Iniciar nueva nota
    this.currentNote = {
      note: noteName,
      midiNumber,
      frequency,
      startTime: now,
      endTime: now,
      duration: 0,
    };
  }

  private finishCurrentNote() {
    if (!this.currentNote) return;
    const now = Date.now();
    this.currentNote.endTime = now;
    this.currentNote.duration = now - this.currentNote.startTime!;

    // Solo guardar si duró al menos 80ms (evitar notas espurias)
    if (this.currentNote.duration! >= 80) {
      this.notes.push({
        note: this.currentNote.note!,
        midiNumber: this.currentNote.midiNumber!,
        frequency: this.currentNote.frequency!,
        startTime: this.currentNote.startTime!,
        endTime: this.currentNote.endTime!,
        duration: this.currentNote.duration!,
      });
    }
    this.currentNote = null;
  }

  private noteNameToMidi(noteName: string): number {
    const noteMap: Record<string, number> = {
      "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
      "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
      "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
    };
    const match = noteName.match(/^([A-G][b#]?)(\d+)$/);
    if (!match) return 60;
    const step = noteMap[match[1]] ?? 0;
    const octave = parseInt(match[2], 10);
    return (octave + 1) * 12 + step;
  }
}