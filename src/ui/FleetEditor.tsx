import { AGGRESSIVENESS, BATTLE_CONFIG, type AggressivenessId } from '../data/battle';
import { screeningRatio } from '../sim/battle';
import { DEFAULT_CATALOG, deriveStats, isValidDesign, type Design, type FleetSetup } from '../sim/designer';
import { pct } from './format';

interface Props {
  fleets: [FleetSetup, FleetSetup];
  setFleets: (f: [FleetSetup, FleetSetup]) => void;
  designs: Design[];
  problems: string[];
  onReset: () => void;
}

export function FleetEditor({ fleets, setFleets, designs, problems, onReset }: Props) {
  const update = (side: 0 | 1, fleet: FleetSetup) => {
    const next: [FleetSetup, FleetSetup] = [fleets[0], fleets[1]];
    next[side] = fleet;
    setFleets(next);
  };
  return (
    <section className="fleet-editor">
      <div className="fleet-editor-head">
        <h2>Fleets</h2>
        <span className="muted">Pick designs and counts; the battle below restarts when the fleets change.</span>
        <button onClick={onReset}>Reset to default fleets</button>
      </div>
      <div className="fleets">
        <SideEditor side={0} fleet={fleets[0]} designs={designs} onChange={(f) => update(0, f)} />
        <SideEditor side={1} fleet={fleets[1]} designs={designs} onChange={(f) => update(1, f)} />
      </div>
      {problems.length > 0 && (
        <ul className="problems">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SideEditor({
  side,
  fleet,
  designs,
  onChange,
}: {
  side: 0 | 1;
  fleet: FleetSetup;
  designs: Design[];
  onChange: (f: FleetSetup) => void;
}) {
  const byId = new Map(designs.map((d) => [d.id, d]));
  let screens = 0;
  let capitals = 0;
  for (const e of fleet.ships) {
    const d = byId.get(e.designId);
    if (!d || !isValidDesign(DEFAULT_CATALOG, d)) continue;
    if (deriveStats(DEFAULT_CATALOG, d).line === 'screen') screens += e.count;
    else capitals += e.count;
  }
  const setEntry = (i: number, patch: Partial<FleetSetup['ships'][number]>) =>
    onChange({ ...fleet, ships: fleet.ships.map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  return (
    <div className={`fleet side-${side}`}>
      <div className="side-head">
        <input className="side-name" value={fleet.name} onChange={(e) => onChange({ ...fleet, name: e.target.value })} />
        <select
          value={fleet.aggressiveness}
          onChange={(e) => onChange({ ...fleet, aggressiveness: e.target.value as AggressivenessId })}
        >
          {(Object.keys(AGGRESSIVENESS) as AggressivenessId[]).map((id) => (
            <option key={id} value={id}>
              {AGGRESSIVENESS[id].label} (retreat below {pct(AGGRESSIVENESS[id].retreatThreshold)})
            </option>
          ))}
        </select>
      </div>
      <div className="fleet-meta">
        <span>{screens + capitals} ships</span>
        <span>{capitals} capitals · {screens} screens</span>
        <span>
          Screening {pct(screeningRatio(BATTLE_CONFIG, screens, capitals))} (target {BATTLE_CONFIG.screening.screensPerCapital} per capital)
        </span>
      </div>
      {fleet.ships.map((entry, i) => (
        <div className="fleet-row" key={i}>
          <select value={entry.designId} onChange={(e) => setEntry(i, { designId: e.target.value })}>
            {!byId.has(entry.designId) && <option value={entry.designId}>(deleted design)</option>}
            {designs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {isValidDesign(DEFAULT_CATALOG, d) ? '' : ' (invalid)'}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={30}
            value={entry.count}
            onChange={(e) => setEntry(i, { count: Math.max(0, Math.min(30, Math.floor(Number(e.target.value) || 0))) })}
          />
          <button className="danger" onClick={() => onChange({ ...fleet, ships: fleet.ships.filter((_, j) => j !== i) })}>
            Remove
          </button>
        </div>
      ))}
      <button onClick={() => onChange({ ...fleet, ships: [...fleet.ships, { designId: designs[0]!.id, count: 1 }] })}>
        Add ships
      </button>
    </div>
  );
}
