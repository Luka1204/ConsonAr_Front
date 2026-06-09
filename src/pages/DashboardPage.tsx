import { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import { getMyScores, createScore } from "../services/score.service";
import ScoreList from "../components/scores/ScoreList";
import Recorder from "../components/audio/Recorder";
import SheetMusic from "../components/audio/SheetMusic";
import InstrumentSelector from "../components/audio/InstrumentSelector";
import FileUpload from "../components/audio/FileUpload";
import type { RecordedNote } from "../audio/noteRecorder";
import { INSTRUMENTS, type Instrument } from "../audio/instruments";

export default function DashboardPage() {
  const { token, logout } = useContext(AuthContext);
  const [scores, setScores] = useState<Record<string, unknown>[]>([]);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [activeInstrument, setActiveInstrument] = useState<Instrument>(INSTRUMENTS[0]);
  const [tabMode, setTabMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"record" | "upload">("record");

  const loadScores = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getMyScores(token);
      setScores(data);
    } catch (e) {
      console.error("Error loading scores:", e);
    }
  }, [token]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  const handleInstrumentChange = (instrument: Instrument) => {
    setActiveInstrument(instrument);
    if (instrument.type !== "both") setTabMode(false);
  };

  const handleNotesDetected = (notes: RecordedNote[], _fileName: string) => {
    setRecordedNotes(notes);
  };

  const handleCreate = async () => {
    if (!token || recordedNotes.length === 0) return;
    const firstTime = recordedNotes[0]?.startTime ?? 0;
    const newScore = {
      title: "Improvisación demo",
      notes: recordedNotes.map((n) => ({
        note: n.note,
        midiNumber: n.midiNumber,
        frequency: n.frequency,
        time: n.startTime - firstTime,
        duration: n.duration,
      })),
    };
    try {
      await createScore(token, newScore);
      loadScores();
    } catch (e) {
      console.error("Error creating score:", e);
    }
  };

  const handleSaveToServer = async () => {
    if (!token || recordedNotes.length === 0) return;
    const firstTime = recordedNotes[0]?.startTime ?? 0;
    const newScore = {
      title: `Grabación ${new Date().toLocaleString()}`,
      notes: recordedNotes.map((n) => ({
        note: n.note,
        midiNumber: n.midiNumber,
        frequency: n.frequency,
        time: n.startTime - firstTime,
        duration: n.duration,
      })),
    };
    try {
      await createScore(token, newScore);
      alert("Partitura guardada en el servidor");
      loadScores();
    } catch (e) {
      console.error("Error saving score:", e);
      alert("Error al guardar la partitura");
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <span className="app-logo">ConsonAr</span>
        <button className="btn btn-danger btn-sm" onClick={logout}>
          Cerrar sesión
        </button>
      </header>

      {/* Selector de instrumento */}
      <div className="card animate-fade-in" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2 style={{ margin: 0 }}>🎛️ Instrumento</h2>
        </div>
        <InstrumentSelector
          selected={activeInstrument.id}
          onSelect={handleInstrumentChange}
          showTabOption={activeInstrument.type === "both"}
          tabMode={tabMode}
          onTabModeChange={setTabMode}
        />
      </div>

      {/* Tabs: Grabación o Carga de archivo */}
      <div className="source-tabs">
        <button
          className={`source-tab ${activeTab === "record" ? "active" : ""}`}
          onClick={() => setActiveTab("record")}
        >
          🎙️ Grabación en vivo
        </button>
        <button
          className={`source-tab ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => setActiveTab("upload")}
        >
          📂 Archivo de audio
        </button>
      </div>

      {activeTab === "record" ? (
        <Recorder onNotesChange={setRecordedNotes} />
      ) : (
        <FileUpload onNotesDetected={handleNotesDetected} />
      )}

      {/* Partitura / Tablatura */}
      <SheetMusic
        notes={recordedNotes}
        instrument={activeInstrument}
        tabMode={tabMode}
      />

      {/* Acciones */}
      {recordedNotes.length > 0 && (
        <div className="action-bar animate-fade-in">
          <button className="btn btn-primary" onClick={handleSaveToServer}>
            <span>💾</span> Guardar en servidor
          </button>
          <button className="btn btn-warning btn-sm" onClick={handleCreate}>
            <span>➕</span> Demo rápido
          </button>
        </div>
      )}

      {/* Partituras existentes */}
      <div className="card animate-fade-in">
        <div className="card-header">
          <h2 style={{ margin: 0 }}>Mis Partituras</h2>
        </div>
        <ScoreList scores={scores} />
      </div>
    </div>
  );
}