import { INSTRUMENTS, type Instrument } from "../../audio/instruments";

type Props = {
  selected: string;
  onSelect: (instrument: Instrument) => void;
  showTabOption?: boolean;
  tabMode: boolean;
  onTabModeChange?: (tab: boolean) => void;
};

export default function InstrumentSelector({
  selected,
  onSelect,
  showTabOption,
  tabMode,
  onTabModeChange,
}: Props) {
  const current = INSTRUMENTS.find((i) => i.id === selected) ?? INSTRUMENTS[0];

  return (
    <div className="instrument-selector">
      <div className="instrument-grid">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            className={`instrument-chip ${inst.id === selected ? "active" : ""}`}
            onClick={() => onSelect(inst)}
            title={inst.name}
          >
            <span className="instrument-icon">{inst.icon}</span>
            <span className="instrument-name">{inst.name}</span>
          </button>
        ))}
      </div>

      {showTabOption && current.type === "both" && onTabModeChange && (
        <div className="tab-toggle">
          <button
            className={`btn btn-sm ${!tabMode ? "btn-primary" : "btn-outline"}`}
            onClick={() => onTabModeChange(false)}
          >
            🎼 Partitura
          </button>
          <button
            className={`btn btn-sm ${tabMode ? "btn-primary" : "btn-outline"}`}
            onClick={() => onTabModeChange(true)}
          >
            🎸 Tablatura
          </button>
        </div>
      )}
    </div>
  );
}