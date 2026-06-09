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
    const bg = document.createElement("div");
    bg.style.cssText = "background:#ffffff;overflow-x:auto;overflow-y:hidden;border-radius:4px;";
    el.appendChild(bg);

    const divId = `vex-${Date.now()}`;
    const renderDiv = document.createElement("div");
    renderDiv.id = divId;
    bg.appendChild(renderDiv);

    // Limit notes to 20
    const maxN = 20;
    const shown = notes.length > maxN
      ? notes.filter((_, i) => i % Math.ceil(notes.length / maxN) === 0)
      : notes;

    const margin = 50;
    const staveW = Math.max(400, Math.min(shown.length * 85, 2000));
    const totalW = staveW + margin * 2;
    const totalH = isTab ? 450 : 210;

    try {
      const renderer = new VF.Renderer(renderDiv, VF.Renderer.Backends.SVG);
      renderer.resize(totalW, totalH);
      const ctx = renderer.getContext();

      const staveNotes = shown.map((n: RecordedNote) => {
        const vn = toVFNote(n.note);
        const d = toDur(n.duration);
        const sn = new VF.StaveNote({ keys: [vn], duration: d, autoStem: true });
        if (vn.includes("#")) sn.addModifier(new VF.Accidental("#"), 0);
        else if (vn.includes("b")) sn.addModifier(new VF.Accidental("b"), 0);
        return sn;
      });

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
        const standardStave = new VF.Stave(margin, 10, staveW);
        standardStave.addClef(instrument.clef === "bass" ? "bass" : "treble");
        standardStave.setContext(ctx);
        standardStave.draw();

        if (staveNotes.length > 0) {
          VF.Formatter.FormatAndDraw(ctx, standardStave, staveNotes);
        }
        beams.forEach((b: any) => { try { b.setContext(ctx).draw(); } catch {} });

        const tabStave = new VF.TabStave(margin, 220, staveW, { numLines });
        tabStave.setContext(ctx);
        tabStave.draw();

        const tabNotes: any[] = [];
        for (const n of shown) {
          const pos = midiToTabPosition(n.midiNumber, instrument.strings!);
          const d = toDur(n.duration);
          if (pos && pos.fret >= 0 && pos.str >= 0 && pos.str < numLines) {
            try {
              tabNotes.push(new VF.TabNote({
                positions: [{ str: pos.str, fret: pos.fret }],
                duration: d,
              }));
            } catch { /* skip */ }
          }
        }

        if (tabNotes.length > 0) {
          try {
            VF.Formatter.FormatAndDraw(ctx, tabStave, tabNotes);
          } catch (e) {
            console.error("Tab error:", e);
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