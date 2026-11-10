import { useMemo, useState } from 'react';
import { ROLE_SUGGESTIONS } from '../data/designs';
import { HULLS, HULL_CLASS_NAMES } from '../data/hulls';
import { MODULE_CATEGORY_NAMES } from '../data/modules';
import { PRODUCTION } from '../data/production';
import {
  changeHull,
  compareStats,
  DEFAULT_CATALOG as CATALOG,
  deriveStats,
  designCost,
  designYear,
  modulesForSlot,
  newDesign,
  setSlot,
  validateDesign,
  type Design,
  type DesignStats,
  type HullClass,
  type SlotGroup,
} from '../sim/designer';
import { formatModuleStats, STAT_ROWS, statValue } from './format';

interface Props {
  userDesigns: Design[];
  setUserDesigns: (fn: (prev: Design[]) => Design[]) => void;
  allDesigns: Design[];
}

const newId = () => `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const isPreset = (d: Design) => d.id.startsWith('preset_');

const GROUP_TITLES: Record<SlotGroup, string> = {
  fixed: 'Fixed modules',
  main: 'Main armament',
  secondary: 'Secondary armament',
  custom: 'Custom slots',
};

export function DesignerView({ userDesigns, setUserDesigns, allDesigns }: Props) {
  const [selectedId, setSelectedId] = useState<string>(() => userDesigns[0]?.id ?? allDesigns[0]!.id);
  const [compareId, setCompareId] = useState<string>('');
  const selected = allDesigns.find((d) => d.id === selectedId) ?? allDesigns[0]!;
  const readOnly = isPreset(selected);

  const update = (d: Design) => setUserDesigns((prev) => prev.map((x) => (x.id === d.id ? d : x)));

  const copy = (source: Design) => {
    const d: Design = { ...source, id: newId(), name: `${source.name} (copy)`, slots: { ...source.slots } };
    setUserDesigns((prev) => [...prev, d]);
    setSelectedId(d.id);
    setCompareId(source.id);
  };

  const create = (hullId: string) => {
    const hull = CATALOG.hulls.get(hullId)!;
    const d = newDesign(CATALOG, hullId, newId(), `New ${HULL_CLASS_NAMES[hull.hullClass].toLowerCase()}`);
    setUserDesigns((prev) => [...prev, d]);
    setSelectedId(d.id);
    setCompareId('');
  };

  const remove = (d: Design) => {
    if (!confirm(`Delete "${d.name}"? Fleets using it will skip it.`)) return;
    setUserDesigns((prev) => prev.filter((x) => x.id !== d.id));
    setSelectedId(allDesigns[0]!.id);
  };

  const compare = allDesigns.find((d) => d.id === compareId && d.id !== selected.id);

  return (
    <div className="designer">
      <DesignList
        presets={allDesigns.filter(isPreset)}
        user={userDesigns}
        selectedId={selected.id}
        onSelect={setSelectedId}
        onCreate={create}
      />
      <div className="designer-main">
        <DesignEditor
          design={selected}
          readOnly={readOnly}
          onChange={update}
          onCopy={() => copy(selected)}
          onDelete={() => remove(selected)}
        />
      </div>
      <StatsPanel
        design={selected}
        compare={compare}
        compareId={compareId}
        setCompareId={setCompareId}
        allDesigns={allDesigns}
      />
    </div>
  );
}

function DesignList({
  presets,
  user,
  selectedId,
  onSelect,
  onCreate,
}: {
  presets: Design[];
  user: Design[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (hullId: string) => void;
}) {
  const [hullId, setHullId] = useState('dd2');
  const item = (d: Design) => {
    const hull = CATALOG.hulls.get(d.hullId);
    const valid = validateDesign(CATALOG, d).length === 0;
    return (
      <button key={d.id} className={`design-item ${d.id === selectedId ? 'selected' : ''}`} onClick={() => onSelect(d.id)}>
        <span className="design-item-name">
          {d.name}
          {!valid && <span className="invalid-dot" title="Invalid design"> !</span>}
        </span>
        <span className="muted" title={`Newest technology in the design: ${designYear(CATALOG, d)}`}>
          {d.role || (hull ? HULL_CLASS_NAMES[hull.hullClass] : 'Unknown hull')} · {hull?.name ?? d.hullId}
        </span>
      </button>
    );
  };
  return (
    <aside className="design-list panel">
      <h2>Designs</h2>
      <div className="new-design">
        <HullSelect value={hullId} onChange={setHullId} />
        <button className="primary" onClick={() => onCreate(hullId)}>
          New design
        </button>
      </div>
      <h3>Your designs</h3>
      {user.length === 0 && <p className="muted">None yet. Create one above, or copy a preset.</p>}
      {user.map(item)}
      <h3>Presets</h3>
      {presets.map(item)}
    </aside>
  );
}

function HullSelect({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const classes = Object.keys(HULL_CLASS_NAMES) as HullClass[];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {classes.map((c) => (
        <optgroup key={c} label={HULL_CLASS_NAMES[c]}>
          {HULLS.filter((h) => h.hullClass === c).map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.year})
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function DesignEditor({
  design,
  readOnly,
  onChange,
  onCopy,
  onDelete,
}: {
  design: Design;
  readOnly: boolean;
  onChange: (d: Design) => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const hull = CATALOG.hulls.get(design.hullId);
  const issues = validateDesign(CATALOG, design);
  const issueBySlot = new Map(issues.filter((i) => i.slotId).map((i) => [i.slotId!, i.message]));
  const groups: SlotGroup[] = ['fixed', 'main', 'secondary', 'custom'];

  return (
    <section className="panel editor">
      {readOnly && (
        <div className="notice">
          Preset designs are read-only. <button onClick={onCopy}>Copy to edit</button>
        </div>
      )}
      <div className="editor-head">
        <label>
          Name
          <input value={design.name} disabled={readOnly} onChange={(e) => onChange({ ...design, name: e.target.value })} />
        </label>
        <label>
          Role
          <input
            list="role-suggestions"
            value={design.role}
            disabled={readOnly}
            placeholder="e.g. Convoy escort"
            onChange={(e) => onChange({ ...design, role: e.target.value })}
          />
          <datalist id="role-suggestions">
            {ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>
        <label>
          Hull
          <HullSelect value={design.hullId} disabled={readOnly} onChange={(id) => onChange(changeHull(CATALOG, design, id))} />
        </label>
      </div>
      {hull && (
        <p className="muted hull-summary">
          {hull.name}: base HP {hull.hp}, armour {hull.armour}, speed {hull.speed} kn, visibility {hull.visibility},{' '}
          {hull.cost.production} production. Line: {hull.line === 'capital' ? 'capitals' : 'screens'}.
        </p>
      )}

      {hull &&
        groups.map((group) => {
          const slots = hull.slots.filter((s) => s.group === group);
          if (slots.length === 0) return null;
          return (
            <div key={group} className="slot-group">
              <h3>{GROUP_TITLES[group]}</h3>
              {slots.map((slot) => {
                const options = modulesForSlot(CATALOG, hull, slot);
                const current = design.slots[slot.id] ?? '';
                const currentModule = current ? CATALOG.modules.get(current) : undefined;
                const issue = issueBySlot.get(slot.id);
                return (
                  <div key={slot.id} className={`slot ${issue ? 'has-issue' : ''}`}>
                    <span className="slot-label">
                      <span>
                        {slot.label}
                        {slot.required && <span className="required" title="Required">*</span>}
                      </span>
                      <span className="muted slot-accepts">{slot.accepts.map((c) => MODULE_CATEGORY_NAMES[c]).join(', ')}</span>
                    </span>
                    <select
                      value={current}
                      disabled={readOnly}
                      onChange={(e) => onChange(setSlot(design, slot.id, e.target.value || null))}
                    >
                      <option value="">{slot.required ? '- choose -' : '- empty -'}</option>
                      {options.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.year})
                        </option>
                      ))}
                    </select>
                    <span className="slot-detail muted">
                      {issue ?? (currentModule ? `${formatModuleStats(currentModule) || 'no combat stats'} · ${currentModule.cost.production} prod` : '')}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

      {issues.length > 0 && (
        <ul className="problems">
          {issues.map((i, n) => (
            <li key={n}>{i.message}</li>
          ))}
        </ul>
      )}

      <div className="editor-actions">
        <button onClick={onCopy}>Copy design</button>
        {!readOnly && (
          <button className="danger" onClick={onDelete}>
            Delete
          </button>
        )}
        {!readOnly && <span className="muted">Changes save automatically.</span>}
      </div>
    </section>
  );
}

function StatsPanel({
  design,
  compare,
  compareId,
  setCompareId,
  allDesigns,
}: {
  design: Design;
  compare: Design | undefined;
  compareId: string;
  setCompareId: (id: string) => void;
  allDesigns: Design[];
}) {
  const valid = CATALOG.hulls.has(design.hullId);
  const stats = useMemo(() => (valid ? deriveStats(CATALOG, design) : null), [design, valid]);
  const cmpStats = useMemo(() => (compare && CATALOG.hulls.has(compare.hullId) ? deriveStats(CATALOG, compare) : null), [compare]);
  if (!stats) return <aside className="panel stats">Unknown hull.</aside>;
  const diff = cmpStats ? compareStats(cmpStats, stats) : null;
  const cost = designCost(CATALOG, design);
  const cmpCost = compare ? designCost(CATALOG, compare) : null;

  return (
    <aside className="panel stats">
      <div className="stats-head">
        <h2>Stats</h2>
        <select value={compare ? compareId : ''} onChange={(e) => setCompareId(e.target.value)}>
          <option value="">Compare with...</option>
          {allDesigns
            .filter((d) => d.id !== design.id)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      </div>
      <table className="stat-table">
        <thead>
          <tr>
            <th />
            <th>This design</th>
            {cmpStats && <th title={compare!.name}>Compared</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Battle line</td>
            <td>{stats.line === 'capital' ? 'Capitals' : 'Screens'}</td>
            {cmpStats && <td>{cmpStats.line === 'capital' ? 'Capitals' : 'Screens'}</td>}
          </tr>
          {STAT_ROWS.map((row) => {
            const d = diff?.[row.key] ?? 0;
            const cls = d === 0 || row.better === 0 ? '' : d * row.better > 0 ? 'better' : 'worse';
            return (
              <tr key={row.key} className={row.inactive ? 'inactive' : ''}>
                <td title={row.inactive ? 'Shown for design purposes; no battle effect until later slices' : undefined}>
                  {row.label}
                  {row.inactive && ' *'}
                </td>
                <td className={cls}>
                  {statValue(stats, row)}
                  {diff && d !== 0 && <span className="delta"> ({d > 0 ? '+' : ''}{row.format ? row.format(d).replace('+', '') : d})</span>}
                </td>
                {cmpStats && <td className="muted">{statValue(cmpStats, row)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted footnote">* No battle effect yet (spotting, air and submarines come in later slices).</p>

      <h2>Cost</h2>
      <table className="stat-table">
        <tbody>
          <CostRow label="Production" value={cost.production} cmp={cmpCost?.production} />
          <CostRow label="Steel" value={cost.steel} cmp={cmpCost?.steel} />
          <CostRow label="Chromium" value={cost.chromium} cmp={cmpCost?.chromium} />
          <CostRow label="Dockyard-days" value={Math.round(cost.dockyardDays)} cmp={cmpCost ? Math.round(cmpCost.dockyardDays) : undefined} />
          <CostRow
            label={`Days with ${PRODUCTION.referenceDockyards} dockyards`}
            value={cost.daysAtReference}
            cmp={cmpCost?.daysAtReference}
          />
        </tbody>
      </table>

      <PiercingCheck stats={stats} design={design} allDesigns={allDesigns} />
    </aside>
  );
}

function CostRow({ label, value, cmp }: { label: string; value: number; cmp?: number }) {
  const d = cmp === undefined ? 0 : value - cmp;
  return (
    <tr>
      <td>{label}</td>
      <td className={d === 0 ? '' : d < 0 ? 'better' : 'worse'}>
        {value}
        {d !== 0 && <span className="delta"> ({d > 0 ? '+' : ''}{d})</span>}
      </td>
      {cmp !== undefined && <td className="muted">{cmp}</td>}
    </tr>
  );
}

/** Which designs this ship's guns can pierce, and which can pierce it. */
function PiercingCheck({ stats, design, allDesigns }: { stats: DesignStats; design: Design; allDesigns: Design[] }) {
  const rows = allDesigns
    .filter((d) => d.id !== design.id && CATALOG.hulls.has(d.hullId))
    .map((d) => ({ d, s: deriveStats(CATALOG, d) }))
    .sort((a, b) => a.s.armour - b.s.armour);
  const mark = (attack: number, piercing: number, armour: number) =>
    attack <= 0 ? <span className="muted">-</span> : piercing >= armour ? <span className="better">yes</span> : <span className="worse">no</span>;
  const best = (s: DesignStats) =>
    Math.max(s.lightAttack > 0 ? s.lightPiercing : 0, s.heavyAttack > 0 ? s.heavyPiercing : 0, s.torpedoAttack > 0 ? s.torpedoPiercing : 0);
  return (
    <>
      <h2>Piercing check</h2>
      <p className="muted footnote">
        Hits that fail to pierce deal heavily reduced damage. Your armour: <strong>{stats.armour}</strong>.
      </p>
      <table className="stat-table pierce-table">
        <thead>
          <tr>
            <th>Design</th>
            <th>Armour</th>
            <th title="Your light guns pierce it?">Light</th>
            <th title="Your heavy guns pierce it?">Heavy</th>
            <th title="Your torpedoes pierce it?">Torp</th>
            <th title="Can its best weapon pierce your armour?">Pierces you</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ d, s }) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td>{s.armour}</td>
              <td>{mark(stats.lightAttack, stats.lightPiercing, s.armour)}</td>
              <td>{mark(stats.heavyAttack, stats.heavyPiercing, s.armour)}</td>
              <td>{mark(stats.torpedoAttack, stats.torpedoPiercing, s.armour)}</td>
              <td>{best(s) >= stats.armour ? <span className="worse">yes</span> : <span className="better">no</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
