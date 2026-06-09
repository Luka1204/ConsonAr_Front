import { useState, useRef } from "react";
import { analyzeAudioFile, getSupportedAudioFormats } from "../../audio/audioFileAnalyzer";
import type { RecordedNote } from "../../audio/noteRecorder";

type Props = {
  onNotesDetected: (notes: RecordedNote[], fileName: string) => void;
};

export default function FileUpload({ onNotesDetected }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFormats = getSupportedAudioFormats().join(",");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError("");
    setProgress(`Decodificando ${file.name}...`);

    try {
      const result = await analyzeAudioFile(file);
      setProgress(`Analizando ${result.notes.length} notas detectadas...`);

      if (result.notes.length === 0) {
        setError("No se pudieron detectar notas en el archivo. Prueba con otro audio.");
      } else {
        setTimeout(() => {
          onNotesDetected(result.notes, file.name);
          setProgress(`✅ ${result.notes.length} notas detectadas en ${(result.durationMs / 1000).toFixed(1)}s`);
        }, 300);
      }
    } catch (err) {
      console.error("Error analyzing audio:", err);
      setError("Error al analizar el archivo. Asegúrate de que sea un formato de audio válido.");
    } finally {
      setIsAnalyzing(false);
      // Limpiar input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="file-upload animate-fade-in">
      <div className="file-upload-content">
        <div className="file-upload-icon">📂</div>
        <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Cargar archivo de audio</h3>
        <p style={{ margin: "4px 0 12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          MP3, WAV, OGG, FLAC, AAC, M4A
        </p>

        <label className={`file-upload-btn ${isAnalyzing ? "disabled" : ""}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats}
            onChange={handleFileChange}
            disabled={isAnalyzing}
            style={{ display: "none" }}
          />
          <span>{isAnalyzing ? "⏳ Analizando..." : "🎵 Seleccionar archivo"}</span>
        </label>

        {progress && !error && (
          <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            {progress}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--accent-danger)" }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}