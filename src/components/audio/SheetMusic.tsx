import { useRef, useEffect } from "react";
import { VexFlow } from "vexflow";
import type { RecordedNote } from "../../audio/noteRecorder";
import type { Instrument } from "../../audio/instruments";
import { midiToTabPosition } from "../../audio/instruments";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VF = VexFlow as any;

type Props = {
  notes: RecordedNote[];
  instrument: Instrument;
  tabMode: boolean;
};

function toVFNote(n: string): string {
  const m = n.match(/^([A-G])([#b]?)(\d+)$/);
  return m ? `${m[1].toLowerCase()}${m[2]}/${m[3]}` : "c/4";
}

function toDur(ms: number): string {
  const r = ms / 500;
  if (r >= 3.5) return "1";
  if (r >= 1.5) return "2";
  if (r >= 0.75) return "4";
  if (r >= 0.375) return "8";
  return "16";
}

export default function SheetMusic({ notes, instrument, tabMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isTab = tabMode && instrument.type === "both" && !!instrument.strings;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || notes.length === 0) return;

    el.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "background:#ffffff;overflow-x:auto;overflow-y:hidden;border-radius:4px;padding:4px 0;";
    el.appendChild(wrapper);

    const divId = `vex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const renderDiv = document.createElement("div");
    renderDiv.id = divId;
    wrapper.appendChild(renderDiv);

    // Aumentar a máximo 60 notas visibles en lugar de 20
    const maxN = 60;
    const shown = notes.length > maxN
      ? notes.filter((_, i) => i % Math.ceil(notes.length / maxN) === 0)
      : notes;

    const margin = 50;
    // Mejor cálculo de ancho: 80px por nota + margen
    const noteWidth = Math.max(70, Math.min(100, 4000 / shown.length));
    const staveW = Math.max(500, shown.length * noteWidth);
    const totalW = staveW + margin * 2;
    const totalH = isTab ? 700 : 240;  // Mucho más alto para tablatura

    try {
      const renderer = new VF.Renderer(renderDiv, VF.Renderer.Backends.SVG);
      renderer.resize(totalW, totalH);
      const ctx = renderer.getContext();
      ctx.setFont("Arial", 10);

      const staveNotes = shown.map((n: RecordedNote) => {
        const vn = toVFNote(n.note);
        const d = toDur(n.duration);
        const sn = new VF.StaveNote({ keys: [vn], duration: d, autoStem: true });
        if (vn.includes("#")) sn.addModifier(new VF.Accidental("#"), 0);
        else if (vn.includes("b")) sn.addModifier(new VF.Accidental("b"), 0);
        return sn;
      });

      // Beams para notas de corta duración
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const beams: any[] = [];
      let bs = -1;
      for (let i = 0; i < staveNotes.length; i++) {
        const d = staveNotes[i].duration;
        if (d === "8" || d === "16") {
          if (bs === -1) bs = i;
        } else if (bs !== -1) {
          const g = staveNotes.slice(bs, i);
          if (g.length >= 2) beams.push(new VF.Beam(g));
          bs = -1;
        }
      }
      if (bs !== -1) {
        const g = staveNotes.slice(bs);
        if (g.length >= 2) beams.push(new VF.Beam(g));
      }

      if (isTab && instrument.strings) {
        const numLines = instrument.strings!.length;
        
        // Preparar TabNotes - versión simple
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tabNotes: any[] = [];
        for (const n of shown) {
          const pos = midiToTabPosition(n.midiNumber, instrument.strings!);
          const d = toDur(n.duration);
          
          try {
            const fret = (pos && pos.fret >= 0 && pos.str >= 0 && pos.str < numLines) 
              ? String(pos.fret) 
              : "0";
            const str = (pos && pos.str >= 0 && pos.str < numLines) 
              ? pos.str 
              : 0;
              
            const tn = new VF.TabNote({
              positions: [{ str, fret }],
              duration: d,
            });
            tn.setStemDirection(1);
            tabNotes.push(tn);
          } catch (e) { 
            console.warn("Tab note error:", e);
          }
        }
        
        console.log(`TabNotes created: ${tabNotes.length} of ${shown.length}`);
        
        // Dibujar STAVE STANDARD
        const stave = new VF.Stave(margin, 10, staveW);
        stave.addClef(instrument.clef === "bass" ? "bass" : "treble");
        stave.setContext(ctx);
        stave.draw();
        
        if (staveNotes.length > 0) {
          try {
            VF.Formatter.FormatAndDraw(ctx, stave, staveNotes);
            beams.forEach((b: any) => { try { b.setContext(ctx).draw(); } catch {} });
          } catch (e) {
            console.error("Standard stave error:", e);
          }
        }
        
        // Dibujar TABLATURA por separado - renderizado manual en canvas
        if (tabNotes.length > 0) {
          try {
            const tabStave = new VF.TabStave(margin, 200, staveW, { numLines });
            tabStave.setContext(ctx);
            tabStave.draw();
            
            // Renderizar números de trastes manualmente en sus líneas
            const lineHeight = 15;
            const startY = 210; // Primera línea de tablatura
            let x = margin + 30;
            const spacing = Math.max(40, staveW / (tabNotes.length + 1));
            
            ctx.font = "bold 12px Arial";
            ctx.fillStyle = "#000";
            ctx.textAlign = "center";
            
            tabNotes.forEach((tn: any) => {
              try {
                const pos = tn.positions?.[0];
                if (pos) {
                  const str = parseInt(pos.str) || 0; // String (cuerda) 0-5
                  const fret = String(pos.fret || "0");
                  // Cada string es una línea en la tablatura
                  const y = startY + (str * lineHeight) + 5;
                  
                  // Dibujar número en su línea correcta
                  ctx.fillText(fret, x, y);
                  console.log(`Fret: ${fret} on string ${str} at x=${x.toFixed(0)}, y=${y.toFixed(0)}`);
                }
                x += spacing;
              } catch (e) {
                console.warn("Error drawing tab fret:", e);
              }
            });
            
            console.log(`Tab frets rendered: ${tabNotes.length} notes`);
          } catch (e) {
            console.error("Tab stave error:", e);
          }
        }
      } else {
        const stave = new VF.Stave(margin, 35, staveW);
        stave.addClef(instrument.clef === "bass" ? "bass" : "treble");
        stave.setContext(ctx);
        stave.draw();
        VF.Formatter.FormatAndDraw(ctx, stave, staveNotes);
        beams.forEach((b: any) => { try { b.setContext(ctx).draw(); } catch {} });
      }
    } catch (e) {
      console.error("SheetMusic error:", e);
    }
  }, [notes, instrument.clef, isTab, instrument.strings]);

  if (notes.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2 style={{ margin: 0 }}>{instrument.icon} {instrument.name}</h2></div>
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
          <span style={{ fontSize: "2rem", opacity: 0.5 }}>🎼</span>
          <p>Graba notas o sube un archivo de audio para ver la partitura</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <h2 style={{ margin: 0 }}>{instrument.icon} {instrument.name} {isTab ? "— Tablatura" : "— Partitura"}</h2>
        <span className="badge">{notes.length} notas</span>
      </div>
      <div ref={containerRef} />
    </div>
  );
}