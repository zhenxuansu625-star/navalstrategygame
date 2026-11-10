import { useEffect, useMemo, useState } from 'react';
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
  type Hull,
  type HullClass,
  type Module,
  type SlotDef,
} from '../sim/designer';
import { ModuleIcon } from './art/ModuleIcon';
import { ShipSilhouette, silhouetteGeometry, type SilhouetteKind } from './art/ShipSilhouette';
import { Frame } from './components';
import { formatModuleStats, LINE_NAMES, STAT_GROUP_TITLES, STAT_ROWS, statValue, type StatGroup } from './format';

interface Props {
  userDesigns: Design[];
  setUserDesigns: (fn: (prev: Design[]) => Design[]) => void;
  allDesigns: Design[];
}

const newId = () => `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const isPreset = (d: Design) => d.id.startsWith('preset_');

/** Tier numeral shown on a slot tile: taken from the module's name, e.g. "Cruiser engine III". */
function moduleTier(m: Module): string | undefined {
  return / (I{1,3}|IV|V|VI)(?: \(|$)/.exec(m.name)?.[1];
}

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
    if (!confirm(`Scrap the design "${d.name}"? Fleets using it will skip it.`)) return;
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
      <DesignEditor
        design={selected}
        readOnly={readOnly}
        onChange={update}
        onCopy={() => copy(selected)}
        onDelete={() => remove(selected)}
      />
      <StatsPanel design={selected} compare={compare} compareId={compareId} setCompareId={setCompareId} allDesigns={allDesigns} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Design list                                                         */
/* ------------------------------------------------------------------ */

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
        {hull && <ShipSilhouette kind={hull.hullClass} className="design-item-sil" />}
        <span className="design-item-text">
          <span className="design-item-name">
            {d.name}
            {!valid && <span className="invalid-dot" title="Invalid design"> ⚠</span>}
          </span>
          <span className="muted">{d.role || (hull ? HULL_CLASS_NAMES[hull.hullClass] : 'Unknown hull')}</span>
        </span>
      </button>
    );
  };
  return (
    <Frame title="Ship designs" className="design-list">
      <div className="new-design">
        <HullSelect value={hullId} onChange={setHullId} />
        <button className="primary" onClick={() => onCreate(hullId)}>
          New design
        </button>
      </div>
      <div className="list-heading">Your designs</div>
      {user.length === 0 && <p className="muted small">None yet. Start a new design above, or copy a preset.</p>}
      {user.map(item)}
      <div className="list-heading">Admiralty presets</div>
      {presets.map(item)}
    </Frame>
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

/* ------------------------------------------------------------------ */
/* Editor: the ship on the slipway with its slots                      */
/* ------------------------------------------------------------------ */

/** Stage coordinates: the silhouette's 200x52 box sits inside a taller box with room for slot tiles. */
const STAGE = { top: -36, height: 124, tile: 22 };

interface Anchor {
  slotId: string;
  /** Tile centre (stage units). */
  tx: number;
  ty: number;
  /** Point on the ship the callout line goes to. */
  px: number;
  py: number;
}

function stageAnchors(hull: Hull): Anchor[] {
  if (hull.hullClass === 'carrier') return carrierAnchors(hull);
  const kind = hull.hullClass as SilhouetteKind;
  const { p, x, deck } = silhouetteGeometry(kind);
  const turrets = [...p.turrets].sort((a, b) => b.at - a.at);
  const front = turrets[0]!;
  const rear = turrets[turrets.length - 1]!;
  const middle = turrets.slice(1, -1).sort((a, b) => Math.abs(a.at - 0.5) - Math.abs(b.at - 0.5))[0];
  const turretTop = (t: typeof front) => deck - (t.raised ? 3 : 0) - t.size * 0.42;
  const topY = STAGE.top + 3 + STAGE.tile / 2;
  const bottomY = STAGE.top + STAGE.height - 3 - STAGE.tile / 2 - 6;
  const has = (id: string) => hull.slots.some((s) => s.id === id);
  const out: Anchor[] = [];
  if (has('mainRear')) out.push({ slotId: 'mainRear', tx: 40, ty: topY, px: x(rear.at), py: turretTop(rear) });
  if (has('mainMid')) {
    const t = middle ?? { at: 0.5, size: 6, barrels: 1 };
    out.push({ slotId: 'mainMid', tx: 100, ty: topY, px: x(t.at), py: middle ? turretTop(middle) : deck });
  }
  if (has('mainFront')) out.push({ slotId: 'mainFront', tx: 160, ty: topY, px: x(front.at), py: turretTop(front) });
  if (has('armour')) out.push({ slotId: 'armour', tx: 52, ty: bottomY, px: x(0.4), py: 46 });
  if (has('engine')) out.push({ slotId: 'engine', tx: 100, ty: bottomY, px: x(p.funnels[0]!), py: 47 });
  if (has('fireControl')) out.push({ slotId: 'fireControl', tx: 148, ty: bottomY, px: x(p.bridge.at), py: deck - p.bridge.height });
  return out;
}

/** Carriers: hangars along the flight deck on top, fixed modules below. */
function carrierAnchors(hull: Hull): Anchor[] {
  const { x, deck } = silhouetteGeometry('carrier');
  const flightDeck = deck - 5;
  const topY = STAGE.top + 3 + STAGE.tile / 2;
  const bottomY = STAGE.top + STAGE.height - 3 - STAGE.tile / 2 - 6;
  const hangars = hull.slots.filter((s) => s.group === 'deck');
  const out: Anchor[] = hangars.map((slot, i) => {
    const t = hangars.length === 1 ? 0.5 : i / (hangars.length - 1);
    return { slotId: slot.id, tx: 36 + t * 128, ty: topY, px: x(0.12 + t * 0.4), py: flightDeck };
  });
  const has = (id: string) => hull.slots.some((s) => s.id === id);
  if (has('armour')) out.push({ slotId: 'armour', tx: 52, ty: bottomY, px: x(0.3), py: flightDeck + 2 });
  if (has('engine')) out.push({ slotId: 'engine', tx: 100, ty: bottomY, px: x(0.5), py: 47 });
  if (has('fireControl')) out.push({ slotId: 'fireControl', tx: 148, ty: bottomY, px: x(0.6) + 3, py: flightDeck - 13 });
  return out;
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
  const [picking, setPicking] = useState<SlotDef | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    setPicking(null);
    setFocus(null);
  }, [design.id]);

  if (!hull) return <Frame title="Slipway">Unknown hull.</Frame>;

  const anchors = stageAnchors(hull);
  const onStage = new Set(anchors.map((a) => a.slotId));
  const secondary = hull.slots.filter((s) => s.group === 'secondary');
  const custom = hull.slots.filter((s) => s.group === 'custom');
  const focusSlot = hull.slots.find((s) => s.id === focus);
  const focusModuleId = focusSlot ? design.slots[focusSlot.id] : null;
  const focusModule = focusModuleId ? CATALOG.modules.get(focusModuleId) : undefined;

  const tile = (slot: SlotDef, style?: React.CSSProperties) => (
    <SlotTile
      key={slot.id}
      slot={slot}
      moduleId={design.slots[slot.id] ?? null}
      issue={issueBySlot.get(slot.id)}
      style={style}
      readOnly={readOnly}
      onFocus={() => setFocus(slot.id)}
      onOpen={() => {
        setFocus(slot.id);
        if (!readOnly) setPicking(slot);
      }}
    />
  );

  return (
    <Frame
      title="Slipway"
      className="editor"
      actions={<span className="year-badge">Technology {designYear(CATALOG, design)}</span>}
    >
      <div className="nameplate">
        <label>
          <span>Class name</span>
          <input value={design.name} disabled={readOnly} onChange={(e) => onChange({ ...design, name: e.target.value })} />
        </label>
        <label>
          <span>Role</span>
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
        <label className="nameplate-hull">
          <span>Hull</span>
          <HullSelect value={design.hullId} disabled={readOnly} onChange={(id) => onChange(changeHull(CATALOG, design, id))} />
        </label>
      </div>

      {readOnly && (
        <div className="notice">
          <span>Admiralty preset: read-only.</span>
          <button className="primary" onClick={onCopy}>
            Copy to edit
          </button>
        </div>
      )}

      <div className="stage" style={{ aspectRatio: `200 / ${STAGE.height}` }}>
        <svg viewBox={`0 ${STAGE.top} 200 ${STAGE.height}`} className="stage-svg" aria-hidden="true">
          <defs>
            <pattern id="blueprint" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" className="stage-grid" />
            </pattern>
          </defs>
          <rect x={0} y={STAGE.top} width={200} height={STAGE.height} fill="url(#blueprint)" />
          {anchors.map((a) => (
            <g key={a.slotId} className={`callout ${focus === a.slotId ? 'focus' : ''}`}>
              <path
                d={calloutPath(a)}
              />
              <circle cx={a.px} cy={a.py} r={1.3} />
            </g>
          ))}
        </svg>
        <div className="stage-ship" style={stageBox(0, 52)}>
          <ShipSilhouette kind={hull.hullClass as SilhouetteKind} className="stage-sil" title={hull.name} />
        </div>
        {anchors.map((a) => {
          const slot = hull.slots.find((s) => s.id === a.slotId)!;
          return tile(slot, {
            position: 'absolute',
            left: `${((a.tx - STAGE.tile / 2) / 200) * 100}%`,
            top: `${((a.ty - STAGE.tile / 2 - STAGE.top) / STAGE.height) * 100}%`,
            width: `${(STAGE.tile / 200) * 100}%`,
          });
        })}
      </div>

      <div className="slot-info">
        {focusSlot ? (
          <>
            <strong>{focusSlot.label}:</strong>{' '}
            {focusModule ? (
              <>
                {focusModule.name} <span className="muted">({focusModule.year})</span> ·{' '}
                {formatModuleStats(focusModule) || 'no combat stats'} · {focusModule.cost.production} production
              </>
            ) : (
              <span className="muted">empty</span>
            )}
            {issueBySlot.get(focusSlot.id) && <span className="worse"> · {issueBySlot.get(focusSlot.id)}</span>}
          </>
        ) : (
          <span className="muted">
            {hull.name}: base HP {hull.hp}, armour {hull.armour}, {hull.speed} kn, visibility {hull.visibility}. Fights in the{' '}
            {LINE_NAMES[hull.line].toLowerCase()} line. {readOnly ? 'Hover a slot to inspect it.' : 'Click a slot to fit a module.'}
          </span>
        )}
      </div>

      <div className="slot-rows">
        {hull.slots.some((s) => !onStage.has(s.id) && s.group !== 'secondary' && s.group !== 'custom') && (
          <SlotRow title="Other">{hull.slots.filter((s) => !onStage.has(s.id) && (s.group === 'fixed' || s.group === 'main' || s.group === 'deck')).map((s) => tile(s))}</SlotRow>
        )}
        {secondary.length > 0 && <SlotRow title="Secondary armament">{secondary.map((s) => tile(s))}</SlotRow>}
        {custom.length > 0 && <SlotRow title="Custom slots">{custom.map((s) => tile(s))}</SlotRow>}
      </div>

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
            Scrap design
          </button>
        )}
        {!readOnly && <span className="muted small">Changes are saved automatically.</span>}
      </div>

      {picking && (
        <ModulePicker
          hull={hull}
          slot={picking}
          current={design.slots[picking.id] ?? null}
          onPick={(id) => {
            onChange(setSlot(design, picking.id, id));
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </Frame>
  );
}

/** Callout from a slot tile to its point on the ship, leaving room for the caption under top tiles. */
function calloutPath(a: Anchor): string {
  const half = STAGE.tile / 2;
  if (a.ty < 0) {
    const start = a.ty + half + 6;
    return `M ${a.tx} ${start} L ${a.tx} ${start + 3} L ${a.px} ${a.py}`;
  }
  const start = a.ty - half - 1;
  return `M ${a.tx} ${start} L ${a.tx} ${start - 3} L ${a.px} ${a.py}`;
}

function stageBox(y: number, h: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    width: '100%',
    top: `${((y - STAGE.top) / STAGE.height) * 100}%`,
    height: `${(h / STAGE.height) * 100}%`,
  };
}

function SlotRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="slot-row">
      <div className="slot-row-title">{title}</div>
      <div className="slot-row-tiles">{children}</div>
    </div>
  );
}

function SlotTile({
  slot,
  moduleId,
  issue,
  style,
  readOnly,
  onOpen,
  onFocus,
}: {
  slot: SlotDef;
  moduleId: string | null;
  issue?: string;
  style?: React.CSSProperties;
  readOnly: boolean;
  onOpen: () => void;
  onFocus: () => void;
}) {
  const module = moduleId ? CATALOG.modules.get(moduleId) : undefined;
  const tier = module ? moduleTier(module) : undefined;
  return (
    <button
      className={`slot-tile ${module ? 'filled' : 'empty'} ${issue ? 'has-issue' : ''} ${slot.required ? 'required' : ''} ${readOnly ? 'readonly' : ''}`}
      style={style}
      onClick={onOpen}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      title={`${slot.label}${slot.required ? ' (required)' : ''}\n${module ? `${module.name}: ${formatModuleStats(module)}` : 'Empty'}${issue ? `\n${issue}` : ''}`}
    >
      <ModuleIcon category={module?.category ?? 'empty'} className="slot-icon" />
      {tier && <span className="slot-tier">{tier}</span>}
      <span className="slot-caption">{shortSlotLabel(slot)}</span>
    </button>
  );
}

function shortSlotLabel(slot: SlotDef): string {
  switch (slot.id) {
    case 'mainFront':
      return 'Fore';
    case 'mainMid':
      return 'Midship';
    case 'mainRear':
      return 'Aft';
    case 'fireControl':
      return 'Fire ctrl';
    case 'armour':
      return slot.label === 'Deck armour' ? 'Deck' : 'Armour';
    default:
      return slot.label.replace('Secondary ', 'Sec ').replace('Custom ', 'Custom ');
  }
}

function ModulePicker({
  hull,
  slot,
  current,
  onPick,
  onClose,
}: {
  hull: Hull;
  slot: SlotDef;
  current: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const options = modulesForSlot(CATALOG, hull, slot);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal frame" role="dialog" aria-label={`Choose module for ${slot.label}`} onClick={(e) => e.stopPropagation()}>
        <header className="frame-title">
          <span>
            {slot.label} <span className="muted">· {slot.accepts.map((c) => MODULE_CATEGORY_NAMES[c]).join(', ')}</span>
          </span>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="frame-body module-grid">
          {!slot.required && (
            <button className={`module-card ${current === null ? 'current' : ''}`} onClick={() => onPick(null)}>
              <ModuleIcon category="empty" className="module-card-icon" />
              <span className="module-card-text">
                <span className="module-card-name">Leave empty</span>
                <span className="muted small">Saves cost and weight</span>
              </span>
            </button>
          )}
          {options.map((m) => (
            <button key={m.id} className={`module-card ${current === m.id ? 'current' : ''}`} onClick={() => onPick(m.id)}>
              <ModuleIcon category={m.category} className="module-card-icon" />
              <span className="module-card-text">
                <span className="module-card-name">
                  {m.name} <span className="muted">{m.year}</span>
                </span>
                <span className="small">{formatModuleStats(m) || 'no combat stats'}</span>
                <span className="muted small">
                  {m.cost.production} production · {m.cost.steel} steel{m.cost.chromium ? ` · ${m.cost.chromium} chromium` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

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
  if (!stats) return <Frame title="Ship statistics">Unknown hull.</Frame>;
  const diff = cmpStats ? compareStats(cmpStats, stats) : null;
  const cost = designCost(CATALOG, design);
  const cmpCost = compare ? designCost(CATALOG, compare) : null;
  const groups: StatGroup[] = ['combat', 'defence', 'mobility'];

  return (
    <Frame title="Ship statistics" className="stats">
      <select className="compare-select" value={compare ? compareId : ''} onChange={(e) => setCompareId(e.target.value)}>
        <option value="">Compare with another design...</option>
        {allDesigns
          .filter((d) => d.id !== design.id)
          .map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
      </select>
      <div className="stat-line-badge">
        Battle line: <strong>{LINE_NAMES[stats.line]}</strong>
        {cmpStats && <span className="muted"> · comparing with {compare!.name}</span>}
      </div>

      {groups.map((g) => (
        <div key={g} className="stat-group">
          <div className="stat-group-title">{STAT_GROUP_TITLES[g]}</div>
          {STAT_ROWS.filter((r) => r.group === g).map((row) => {
            const d = diff?.[row.key] ?? 0;
            const cls = d === 0 || row.better === 0 ? '' : d * row.better > 0 ? 'better' : 'worse';
            return (
              <div key={row.key} className={`stat-row ${row.inactive ? 'inactive' : ''}`}>
                <span title={row.inactive ? 'Shown for design purposes; no battle effect until later slices' : undefined}>
                  {row.label}
                  {row.inactive && ' *'}
                </span>
                <span className={`stat-value ${cls}`}>
                  {statValue(stats, row)}
                  {diff && d !== 0 && (
                    <span className="delta">
                      {' '}
                      {d > 0 ? '▲' : '▼'}
                      {row.format ? row.format(Math.abs(d)).replace('+', '') : Math.abs(d)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <p className="muted footnote">* No battle effect yet: spotting and submarines come in later slices.</p>

      <div className="stat-group">
        <div className="stat-group-title">Production</div>
        <CostRow label="Production cost" value={cost.production} cmp={cmpCost?.production} />
        <CostRow label="Steel" value={cost.steel} cmp={cmpCost?.steel} />
        <CostRow label="Chromium" value={cost.chromium} cmp={cmpCost?.chromium} />
        <CostRow label="Dockyard-days" value={Math.round(cost.dockyardDays)} cmp={cmpCost ? Math.round(cmpCost.dockyardDays) : undefined} />
        <CostRow label={`Days with ${PRODUCTION.referenceDockyards} dockyards`} value={cost.daysAtReference} cmp={cmpCost?.daysAtReference} />
      </div>

      <PiercingCheck stats={stats} design={design} allDesigns={allDesigns} />
    </Frame>
  );
}

function CostRow({ label, value, cmp }: { label: string; value: number; cmp?: number }) {
  const d = cmp === undefined ? 0 : value - cmp;
  return (
    <div className="stat-row">
      <span>{label}</span>
      <span className={`stat-value ${d === 0 ? '' : d < 0 ? 'better' : 'worse'}`}>
        {value}
        {d !== 0 && (
          <span className="delta">
            {' '}
            {d > 0 ? '▲' : '▼'}
            {Math.abs(d)}
          </span>
        )}
      </span>
    </div>
  );
}

/** Which designs this ship's guns can pierce, and which can pierce it. */
function PiercingCheck({ stats, design, allDesigns }: { stats: DesignStats; design: Design; allDesigns: Design[] }) {
  const rows = allDesigns
    .filter((d) => d.id !== design.id && CATALOG.hulls.has(d.hullId))
    .map((d) => ({ d, s: deriveStats(CATALOG, d) }))
    .sort((a, b) => a.s.armour - b.s.armour);
  const mark = (attack: number, piercing: number, armour: number) =>
    attack <= 0 ? <span className="muted">·</span> : piercing >= armour ? <span className="better">✔</span> : <span className="worse">✘</span>;
  const best = (s: DesignStats) =>
    Math.max(s.lightAttack > 0 ? s.lightPiercing : 0, s.heavyAttack > 0 ? s.heavyPiercing : 0, s.torpedoAttack > 0 ? s.torpedoPiercing : 0);
  return (
    <details className="pierce-check" open>
      <summary className="stat-group-title">Piercing check</summary>
      <p className="muted footnote">
        Hits that fail to pierce deal heavily reduced damage. Your armour: <strong>{stats.armour}</strong>.
      </p>
      <table className="pierce-table">
        <thead>
          <tr>
            <th>Design</th>
            <th title="Armour">Arm</th>
            <th title="Your light guns pierce it?">Lt</th>
            <th title="Your heavy guns pierce it?">Hv</th>
            <th title="Your torpedoes pierce it?">Tp</th>
            <th title="Can its best weapon pierce your armour?">Threat</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ d, s }) => (
            <tr key={d.id}>
              <td title={d.name}>{d.name}</td>
              <td>{s.armour}</td>
              <td>{mark(stats.lightAttack, stats.lightPiercing, s.armour)}</td>
              <td>{mark(stats.heavyAttack, stats.heavyPiercing, s.armour)}</td>
              <td>{mark(stats.torpedoAttack, stats.torpedoPiercing, s.armour)}</td>
              <td>{best(s) >= stats.armour ? <span className="worse">Pierces</span> : <span className="better">Safe</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
