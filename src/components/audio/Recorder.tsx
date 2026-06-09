import { useRef, useState, useEffect, useCallback } from "react";
import { getAudioStream } from "../../audio/audioCapture";
import { createPitchDetector } from "../../audio/pitchDetector";
import { frequencyToNote } from "../../audio/noteMapper";
import { NoteRecorder, type RecordedNote } from "../../audio/noteRecorder";
import { downloadMidi } from "../../services/midiExport";
import { AudioPlayback } from "../../audio/audioPlayback";

function getRMS(buffer: Float32Array) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

type Props = {
  onNotesChange?: (notes: RecordedNote[]) => void;
};

export default function Recorder({ onNotesChange }: Props) {
  const [note, setNote] = useState("-");
  const [frequency, setFrequency] = useState(0);
  const [cents, setCents] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const isRunning = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const recorderRef = useRef<NoteRecorder | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const playbackRef = useRef<AudioPlayback | null>(null);

  const stopTuner = useCallback(() => {
    isRunning.current = false;
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = 0; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);

  useEffect(() => {
    return () => {
      stopTuner();
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [stopTuner]);

  const handleStartRecording = async () => {
    if (isRunning.current) return;
    const { audioContext, source } = await getAudioStream();
    audioCtxRef.current = audioContext;
    streamRef.current = source.mediaStream;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const detectPitch = createPitchDetector(audioContext.sampleRate);

    const recorder = new NoteRecorder(
      (n, f, c) => { setNote(n); setFrequency(f); setCents(c); },
      (notes) => { setRecordedNotes(notes); onNotesChange?.(notes); }
    );
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    elapsedRef.current = 0;
    setRecordingDuration(0);

    durationIntervalRef.current = setInterval(() => {
      elapsedRef.current += 100;
      setRecordingDuration(elapsedRef.current);
    }, 100);

    isRunning.current = true;
    const update = () => {
      if (!isRunning.current) return;
      analyser.getFloatTimeDomainData(buffer);
      const vol = getRMS(buffer);
      setVolume(vol);
      if (vol > 0.005) {
        const pitch = detectPitch(buffer);
        if (pitch && pitch > 70 && pitch < 1200) {
          const detected = frequencyToNote(pitch);
          recorder.feedPitch(pitch, detected.note, detected.cents);
        } else recorder.feedPitch(0, "-", 0);
      } else recorder.feedPitch(0, "-", 0);
      animRef.current = requestAnimationFrame(update);
    };
    update();
  };

  const handleStopRecording = () => {
    if (recorderRef.current) {
      const notes = recorderRef.current.stop();
      setRecordedNotes(notes);
      onNotesChange?.(notes);
      recorderRef.current = null;
    }
    setIsRecording(false);
    setNote("-"); setFrequency(0); setCents(0); setVolume(0);
    if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null; }
    stopTuner();
  };

  const handleReset = () => {
    // First stop any playback
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
      setIsPlaying(false);
    }
    // Clear all state
    setRecordedNotes([]);
    onNotesChange?.([]);
    elapsedRef.current = 0;
    setRecordingDuration(0);
    setNote("-");
    setFrequency(0);
    setCents(0);
  };

  const handleDownloadMidi = () => {
    if (recordedNotes.length > 0) downloadMidi(recordedNotes);
  };

  const handlePlay = () => {
    if (recordedNotes.length === 0) return;
    const pb = new AudioPlayback(() => { setIsPlaying(false); });
    playbackRef.current = pb;
    setIsPlaying(true);
    pb.play(recordedNotes);
  };

  const handleStopPlayback = () => {
    if (playbackRef.current) { playbackRef.current.stop(); playbackRef.current = null; }
    setIsPlaying(false);
  };

  const formatDuration = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="card animate-fade-in" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎤</span>
          <h2 style={{ margin: 0 }}>Grabación de Notas</h2>
        </div>
        {recordedNotes.length > 0 && (
          <span className="badge">{recordedNotes.length} notas</span>
        )}
      </div>

      <div className="status-bar">
        <div className="status-item">
          <div className="status-dot" style={{
            backgroundColor: isRecording ? "var(--accent-danger)" : "var(--text-muted)",
            boxShadow: isRecording ? "0 0 12px var(--accent-danger)" : "none",
            animation: isRecording ? "pulse 1s infinite" : "none",
          }} />
        </div>
        <div className="status-item" style={{ flex: 1 }}>
          <span className="status-label">Nota</span>
          <span className="status-value" style={{
            fontSize: "2rem", fontWeight: 700,
            color: isRecording && note !== "-" ? "var(--accent-primary)" : "var(--text-muted)",
          }}>
            {isRecording ? note : (recordedNotes.length > 0 ? "✓" : "-")}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Frecuencia</span>
          <span className="status-value">
            {isRecording && frequency > 0 ? `${frequency.toFixed(1)} Hz` : "-"}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Cents</span>
          <span className="status-value" style={{
            color: Math.abs(cents) < 10 ? "var(--accent-success)" :
                   Math.abs(cents) < 25 ? "var(--accent-warning)" : "var(--accent-danger)"
          }}>
            {isRecording ? cents : 0}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Volumen</span>
          <div className="volume-bar">
            <div className="volume-fill" style={{ width: `${Math.min(100, (volume * 200))}%` }} />
          </div>
        </div>
        <div className="status-item">
          <span className="status-label">Duración</span>
          <span className="status-value">{formatDuration(recordingDuration)}</span>
        </div>
      </div>

      <div className="button-group">
        {!isRecording ? (
          <button className="btn btn-success" onClick={handleStartRecording}>
            <span>🎙️</span> Iniciar Grabación
          </button>
        ) : (
          <button className="btn btn-danger" onClick={handleStopRecording}>
            <span>⏹️</span> Detener Grabación
          </button>
        )}

        <button
          className="btn btn-warning"
          onClick={handleReset}
          disabled={recordedNotes.length === 0 && !isRecording}
        >
          <span>🗑️</span> Limpiar
        </button>

        {recordedNotes.length > 0 && !isPlaying && (
          <button className="btn btn-accent" onClick={handlePlay}>
            <span>▶️</span> Escuchar
          </button>
        )}
        {isPlaying && (
          <button className="btn btn-danger" onClick={handleStopPlayback}>
            <span>⏹️</span> Detener
          </button>
        )}

        <button
          className="btn btn-primary"
          onClick={handleDownloadMidi}
          disabled={recordedNotes.length === 0}
        >
          <span>🎵</span> Descargar MIDI
        </button>
      </div>

      {recordedNotes.length > 0 && (
        <div className="notes-list animate-fade-in">
          <div className="notes-list-header">
            <span>#</span><span>Nota</span><span>MIDI</span><span>Frecuencia</span><span>Duración</span>
          </div>
          <div className="notes-list-body">
            {recordedNotes.map((n, i) => (
              <div key={i} className="notes-list-item">
                <span className="note-index">#{i + 1}</span>
                <span className="note-name">{n.note}</span>
                <span className="note-midi">{n.midiNumber}</span>
                <span className="note-freq">{n.frequency.toFixed(1)} Hz</span>
                <span className="note-dur">{(n.duration / 1000).toFixed(2)}s</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}