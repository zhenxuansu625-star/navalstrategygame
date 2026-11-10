import { useEffect, useMemo, useState } from 'react';
import { AGGRESSIVENESS, type AggressivenessId } from '../data/battle';
import { BUILDING_NAMES, ECONOMY, MONTH_NAMES } from '../data/economy';
import { HULL_CLASS_NAMES } from '../data/hulls';
import { NATIONS } from '../data/nations';
import { designCost, designYear, type Design, type HullClass } from '../sim/designer';
import {
  aiCommands,
  applyCommand,
  createGame,
  DEFAULT_CONTEXT as CTX,
  designProblem,
  fleetBattleSetup,
  fleetValue,
  freeSlots,
  industryReport,
  infrastructureCost,
  lineCap,
  nationDef,
  resolveModifiers,
  step,
  type BuildingType,
  type Command,
  type GameDate,
  type GameState,
  type NationDef,
  type NationState,
  type ResourceType,
} from '../sim/economy';
import { createRng, rngFromState } from '../sim/rng';
import { ShipSilhouette } from './art/ShipSilhouette';
import { BattleView } from './BattleView';
import { Frame } from './components';
import { pct } from './format';
import { load, save } from './storage';

interface Campaign {
  game: GameState;
  rngState: number;
}

const formatDate = (d: GameDate) => `${MONTH_NAMES[d.month - 1]} ${d.year}`;
const k = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

export function CampaignView({ designs }: { designs: Design[] }) {
  const [campaign, setCampaign] = useState<Campaign | null>(() => load<Campaign | null>('campaign', null));
  useEffect(() => save('campaign', campaign), [campaign]);

  if (!campaign) {
    return (
      <CampaignSetup
        onStart={(playerId, rivalId, startYear) =>
          setCampaign({ game: createGame(CTX, { playerId, rivalId, startYear }), rngState: createRng(startYear).getState() })
        }
      />
    );
  }
  return <CampaignScreen campaign={campaign} setCampaign={setCampaign} designs={designs} />;
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

function CampaignSetup({ onStart }: { onStart: (playerId: string, rivalId: string, startYear: number) => void }) {
  const [playerId, setPlayerId] = useState('uk');
  const [rivalId, setRivalId] = useState('germany');
  const [startYear, setStartYear] = useState(ECONOMY.defaultStartYear);
  const rival = rivalId === playerId ? NATIONS.find((n) => n.id !== playerId)!.id : rivalId;
  return (
    <Frame title="New campaign" className="campaign-setup">
      <p className="muted setup-intro">
        Choose the navy you will run. Each month your civilian factories build, your dockyards launch ships, and a rival
        power does the same.
      </p>
      <div className="nation-grid">
        {NATIONS.map((n) => (
          <NationCard key={n.id} def={n} selected={n.id === playerId} onSelect={() => setPlayerId(n.id)} />
        ))}
      </div>
      <div className="setup-row">
        <label>
          <span>Rival</span>
          <select value={rival} onChange={(e) => setRivalId(e.target.value)}>
            {NATIONS.filter((n) => n.id !== playerId).map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Start year</span>
          <select value={startYear} onChange={(e) => setStartYear(Number(e.target.value))}>
            {ECONOMY.startYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" onClick={() => onStart(playerId, rival, startYear)}>
          Start campaign
        </button>
      </div>
      <p className="muted small">
        Until research is added, a design can be laid down once the year reaches its newest technology. Pick a later start
        year to build later ships.
      </p>
    </Frame>
  );
}

function NationCard({ def, selected, onSelect }: { def: NationDef; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`nation-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span className="nation-name">{def.name}</span>
      <span className="nation-blurb">{def.blurb}</span>
      <span className="nation-industry">
        {def.civilianFactories} factories · {def.dockyards} dockyards · {def.buildingSlots} slots · {def.resources.steel} steel
      </span>
      <TraitList def={def} />
    </button>
  );
}

function TraitList({ def }: { def: NationDef }) {
  return (
    <span className="trait-list">
      {def.traits.map((t) => (
        <span key={t.id} className={`trait ${t.kind} ${t.inactive ? 'inactive' : ''}`} title={t.inactive ?? undefined}>
          <strong>{t.name}:</strong> {t.description}
          {t.inactive && <em> Not active yet: needs submarines.</em>}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Main screen                                                         */
/* ------------------------------------------------------------------ */

function CampaignScreen({
  campaign,
  setCampaign,
  designs,
}: {
  campaign: Campaign;
  setCampaign: (c: Campaign | null) => void;
  designs: Design[];
}) {
  const { game } = campaign;
  const [error, setError] = useState<string | null>(null);
  const [warGame, setWarGame] = useState(false);
  const player = game.nations[game.playerId]!;
  const rival = game.nations[game.rivalId]!;
  const playerDef = nationDef(CTX, game.playerId);
  const rivalDef = nationDef(CTX, game.rivalId);
  const report = useMemo(() => industryReport(CTX, player), [player]);
  const over = game.date.year > ECONOMY.endYear;

  const command = (cmd: Command) => {
    const result = applyCommand(CTX, game, game.playerId, cmd);
    setError(result.error ?? null);
    if (!result.error) setCampaign({ ...campaign, game: result.state });
  };

  const advance = (months: number) => {
    const rng = rngFromState(campaign.rngState);
    let g = game;
    for (let i = 0; i < months && g.date.year <= ECONOMY.endYear; i++) {
      g = step(g, { [g.rivalId]: aiCommands(CTX, g, g.rivalId) }, rng, CTX);
    }
    setError(null);
    setCampaign({ game: g, rngState: rng.getState() });
  };

  const battleSetup = useMemo(
    () => (warGame ? fleetBattleSetup(CTX, game, game.playerId, game.rivalId) : null),
    [warGame, game],
  );

  return (
    <div className="campaign">
      <Frame className="campaign-header">
        <div className="campaign-top">
          <div>
            <div className="campaign-nation">{playerDef.name}</div>
            <div className="muted small">
              Rival: {rivalDef.name} · turn {game.turn}
            </div>
          </div>
          <div className="campaign-date">{formatDate(game.date)}</div>
          <div className="campaign-actions">
            <button className="primary" onClick={() => advance(1)} disabled={over}>
              End month
            </button>
            <button onClick={() => advance(6)} disabled={over} title="Advance six months with the current orders">
              +6 months
            </button>
            <button onClick={() => advance(12)} disabled={over} title="Advance a year with the current orders">
              +1 year
            </button>
            <button
              className="danger"
              onClick={() => {
                if (confirm('Abandon this campaign and start a new one?')) setCampaign(null);
              }}
            >
              New campaign
            </button>
          </div>
        </div>
        <IndustryStrip nation={player} report={report} />
        <TraitList def={playerDef} />
        {over && <div className="notice">The campaign has reached {ECONOMY.endYear}. Start a new one to keep playing.</div>}
        {error && <div className="problems-line">{error}</div>}
      </Frame>

      <div className="campaign-columns">
        <ConstructionPanel nation={player} report={report} command={command} />
        <ProductionPanel game={game} nation={player} report={report} designs={designs} command={command} />
      </div>

      <div className="campaign-columns">
        <FleetPanel title={`${playerDef.adjective} Navy`} nation={player} side={0} />
        <FleetPanel title={`${rivalDef.adjective} Navy (rival)`} nation={rival} side={1} industry />
      </div>

      <Frame
        title="War game"
        actions={
          <>
            <select
              value={player.aggressiveness}
              onChange={(e) => command({ type: 'setAggressiveness', aggressiveness: e.target.value as AggressivenessId })}
              title="Your fleet's standing orders"
            >
              {(Object.keys(AGGRESSIVENESS) as AggressivenessId[]).map((id) => (
                <option key={id} value={id}>
                  {AGGRESSIVENESS[id].label}
                </option>
              ))}
            </select>
            <button className={warGame ? '' : 'primary'} onClick={() => setWarGame(!warGame)}>
              {warGame ? 'Close' : `Fight the ${rivalDef.adjective} Navy`}
            </button>
          </>
        }
      >
        <p className="muted small war-game-hint">
          A what-if battle between both whole fleets as they stand this month. Nothing is lost: real wars arrive in a later
          slice.
        </p>
      </Frame>
      {battleSetup && <BattleView setup={battleSetup} />}

      <Frame title="Dispatches" className="events">
        {game.events.length === 0 && <p className="muted small">Nothing to report yet. End the month to begin.</p>}
        <ul>
          {game.events
            .filter((e) => e.nationId === game.playerId || e.kind === 'launch')
            .reverse()
            .slice(0, 14)
            .map((e, i) => (
              <li key={i} className={e.nationId === game.playerId ? 'side-0-text' : 'side-1-text'}>
                <span className="muted">{formatDate(e.date)}</span> {nationDef(CTX, e.nationId).name}: {e.text}
              </li>
            ))}
        </ul>
      </Frame>
    </div>
  );
}

function IndustryStrip({ nation, report }: { nation: NationState; report: ReturnType<typeof industryReport> }) {
  const used = nation.dockyards - report.idleDockyards;
  const resource = (r: ResourceType, label: string) => {
    const short = report.demand[r] > report.supply[r];
    return (
      <div className={`stat-cell ${short ? 'warn' : ''}`} title={`${label}: lines need ${report.demand[r]}, you have ${report.supply[r]}`}>
        <div className="stat-cell-label">{label}</div>
        <div className="stat-cell-value">
          {report.demand[r]} <span className="muted">/ {report.supply[r]}</span>
        </div>
        <div className="stat-cell-sub">{short ? 'Short: lines slowed' : 'needed / supply'}</div>
      </div>
    );
  };
  return (
    <div className="stat-strip">
      <div className="stat-cell" title="Civilian factories build everything else">
        <div className="stat-cell-label">Civilian factories</div>
        <div className="stat-cell-value">{nation.civilianFactories}</div>
        <div className="stat-cell-sub">
          {report.constructionFactories} building · {report.consumerGoods} consumer goods · {report.tradeFactories} trade
        </div>
      </div>
      <div className={`stat-cell ${report.idleFactories > 0 ? 'warn' : ''}`}>
        <div className="stat-cell-label">Idle factories</div>
        <div className="stat-cell-value">{report.idleFactories}</div>
        <div className="stat-cell-sub">{report.idleFactories > 0 ? 'Queue more projects' : 'all at work'}</div>
      </div>
      <div className={`stat-cell ${report.idleDockyards > 0 ? 'warn' : ''}`}>
        <div className="stat-cell-label">Dockyards</div>
        <div className="stat-cell-value">
          {used} <span className="muted">/ {nation.dockyards}</span>
        </div>
        <div className="stat-cell-sub">{report.idleDockyards > 0 ? `${report.idleDockyards} idle` : 'in use / total'}</div>
      </div>
      <div className={`stat-cell ${freeSlots(nation) <= 0 ? 'warn' : ''}`} title="Factories and dockyards each take a slot; infrastructure adds slots">
        <div className="stat-cell-label">Building slots</div>
        <div className="stat-cell-value">
          {report.slotsUsed} <span className="muted">/ {nation.buildingSlots}</span>
        </div>
        <div className="stat-cell-sub">{freeSlots(nation) <= 0 ? 'Full: build infrastructure' : `${freeSlots(nation)} free`}</div>
      </div>
      {resource('steel', 'Steel')}
      {resource('chromium', 'Chromium')}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

function ConstructionPanel({
  nation,
  report,
  command,
}: {
  nation: NationState;
  report: ReturnType<typeof industryReport>;
  command: (c: Command) => void;
}) {
  const cfg = ECONOMY.construction;
  const mods = resolveModifiers(nationDef(CTX, nation.id));
  const noSlots = freeSlots(nation) <= 0;
  const cost = (b: BuildingType) => (b === 'infrastructure' ? infrastructureCost(CTX, nation) : cfg.cost[b]);
  const buttons: { building: BuildingType; hint: string }[] = [
    { building: 'civilianFactory', hint: 'Builds more buildings. Slow at first, pays off over years.' },
    { building: 'dockyard', hint: 'Builds ships now.' },
    { building: 'infrastructure', hint: `Adds ${cfg.slotsPerInfrastructure} building slots. Each level costs more.` },
  ];
  return (
    <Frame title="Construction" className="construction">
      <div className="queue-buttons">
        {buttons.map(({ building, hint }) => (
          <button
            key={building}
            onClick={() => command({ type: 'queueBuilding', building })}
            disabled={building !== 'infrastructure' && noSlots}
            title={hint}
          >
            + {BUILDING_NAMES[building]} <span className="muted">{k(cost(building))}</span>
          </button>
        ))}
      </div>
      <label className="standing-order" title="Keeps the queue topped up each month, adding infrastructure when slots run out">
        <span>Standing order</span>
        <select
          value={nation.autoBuild ?? ''}
          onChange={(e) => command({ type: 'setAutoBuild', building: (e.target.value || null) as 'civilianFactory' | 'dockyard' | null })}
        >
          <option value="">None: I will queue projects myself</option>
          <option value="civilianFactory">Keep building civilian factories</option>
          <option value="dockyard">Keep building dockyards</option>
        </select>
      </label>
      {nation.construction.length === 0 && (
        <p className="muted small">The queue is empty. Each project uses up to {cfg.maxFactoriesPerProject} factories.</p>
      )}
      {nation.construction.map((item, i) => {
        const factories = report.factoriesPerItem[i] ?? 0;
        const rate = factories * cfg.outputPerFactory * Math.max(0, 1 + mods.constructionSpeed[item.building]);
        const months = rate > 0 ? Math.max(1, Math.ceil((item.cost - item.progress) / rate)) : null;
        return (
          <div key={item.id} className={`queue-item ${factories === 0 ? 'stalled' : ''}`}>
            <div className="queue-item-head">
              <span className="queue-item-name">{BUILDING_NAMES[item.building]}</span>
              <span className="muted small">
                {factories} factories · {months ? `${months} mo` : 'waiting'}
              </span>
              <span className="row-buttons">
                <button className="icon-button" disabled={i === 0} onClick={() => command({ type: 'moveBuilding', itemId: item.id, to: i - 1 })} aria-label="Move up">
                  ▲
                </button>
                <button
                  className="icon-button"
                  disabled={i === nation.construction.length - 1}
                  onClick={() => command({ type: 'moveBuilding', itemId: item.id, to: i + 1 })}
                  aria-label="Move down"
                >
                  ▼
                </button>
                <button className="icon-button danger" onClick={() => command({ type: 'cancelBuilding', itemId: item.id })} aria-label="Cancel">
                  ✕
                </button>
              </span>
            </div>
            <Progress value={item.progress / item.cost} />
          </div>
        );
      })}

      <div className="panel-heading">Trade</div>
      <p className="muted small">Each factory on trade imports resources instead of building.</p>
      {(['steel', 'chromium'] as ResourceType[]).map((r) => (
        <div key={r} className="trade-row">
          <span className="trade-name">{r === 'steel' ? 'Steel' : 'Chromium'}</span>
          <Stepper
            value={nation.trade[r]}
            onChange={(n) => command({ type: 'setTrade', resource: r, factories: n })}
            label={`${r} trade factories`}
          />
          <span className="muted small">
            factories · +{Math.floor(nation.trade[r] * ECONOMY.trade.perFactory[r] * (1 + mods.tradeYield))} (home supply{' '}
            {nation.resources[r]})
          </span>
        </div>
      ))}
    </Frame>
  );
}

function Progress({ value, kind = 'build' }: { value: number; kind?: 'build' | 'eff' }) {
  return (
    <div className={`progress ${kind}`}>
      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

function Stepper({ value, onChange, max, label }: { value: number; onChange: (n: number) => void; max?: number; label: string }) {
  return (
    <span className="stepper" aria-label={label}>
      <button className="icon-button" onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label="Fewer">
        −
      </button>
      <span className="stepper-value">{value}</span>
      <button className="icon-button" onClick={() => onChange(value + 1)} disabled={max !== undefined && value >= max} aria-label="More">
        +
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Production                                                          */
/* ------------------------------------------------------------------ */

function ProductionPanel({
  game,
  nation,
  report,
  designs,
  command,
}: {
  game: GameState;
  nation: NationState;
  report: ReturnType<typeof industryReport>;
  designs: Design[];
  command: (c: Command) => void;
}) {
  const year = game.date.year;
  const options = useMemo(
    () =>
      designs
        .map((d) => ({ d, problem: designProblem(CTX, d, year), techYear: CTX.catalog.hulls.has(d.hullId) ? designYear(CTX.catalog, d) : 0 }))
        .sort((a, b) => Number(!!a.problem) - Number(!!b.problem) || b.techYear - a.techYear),
    [designs, year],
  );
  const firstBuildable = options.find((o) => !o.problem)?.d.id ?? '';
  const [designId, setDesignId] = useState(firstBuildable);
  const chosen = options.find((o) => o.d.id === designId && !o.problem) ?? options.find((o) => !o.problem);
  const [dockyards, setDockyards] = useState(3);
  const cap = chosen ? lineCap(CTX, chosen.d) : 0;
  const cost = chosen ? designCost(CTX.catalog, chosen.d) : null;

  return (
    <Frame title="Naval production" className="production">
      <div className="add-line">
        <select value={chosen?.d.id ?? ''} onChange={(e) => setDesignId(e.target.value)}>
          {options.map(({ d, problem }) => (
            <option key={d.id} value={d.id} disabled={!!problem}>
              {d.name}
              {d.id.startsWith('preset_') ? '' : ' (yours)'}
              {problem ? ` · ${problem}` : ''}
            </option>
          ))}
        </select>
        <Stepper value={Math.min(dockyards, cap || dockyards)} onChange={(n) => setDockyards(Math.max(1, n))} max={cap} label="Dockyards for the new line" />
        <button
          className="primary"
          disabled={!chosen}
          onClick={() => chosen && command({ type: 'addLine', design: chosen.d, dockyards: Math.min(dockyards, cap) })}
        >
          Add line
        </button>
      </div>
      {cost && chosen && (
        <p className="muted small">
          {chosen.d.name}: {cost.production} production, {cost.steel} steel{cost.chromium ? `, ${cost.chromium} chromium` : ''} · up to{' '}
          {cap} dockyards on one line. Lines higher in the list get dockyards and resources first.
        </p>
      )}
      {nation.lines.length === 0 && <p className="muted small">No production lines yet. Your dockyards are idle.</p>}
      {nation.lines.map((line, i) => {
        const r = report.lines[i]!;
        const hull = CTX.catalog.hulls.get(line.design.hullId);
        return (
          <div key={line.id} className={`line-item ${r.assigned === 0 ? 'stalled' : ''}`}>
            {hull ? <ShipSilhouette kind={hull.hullClass} className="line-sil" /> : <span className="line-sil" />}
            <div className="line-main">
              <div className="queue-item-head">
                <span className="queue-item-name">{line.design.name}</span>
                <span className="muted small">
                  built {line.built}
                  {line.quantity !== null ? ` of ${line.quantity}` : ''} · {r.monthsToNext ? `next in ${r.monthsToNext} mo` : 'stalled'}
                </span>
                <span className="row-buttons">
                  <button className="icon-button" disabled={i === 0} onClick={() => command({ type: 'moveLine', lineId: line.id, to: i - 1 })} aria-label="Raise priority">
                    ▲
                  </button>
                  <button
                    className="icon-button"
                    disabled={i === nation.lines.length - 1}
                    onClick={() => command({ type: 'moveLine', lineId: line.id, to: i + 1 })}
                    aria-label="Lower priority"
                  >
                    ▼
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => {
                      if (line.progress === 0 || confirm(`Remove the ${line.design.name} line? Work on the current ship is lost.`)) {
                        command({ type: 'removeLine', lineId: line.id });
                      }
                    }}
                    aria-label="Remove line"
                  >
                    ✕
                  </button>
                </span>
              </div>
              <Progress value={line.progress / r.cost} />
              <div className="line-meta">
                <Stepper
                  value={line.dockyards}
                  max={r.cap}
                  onChange={(n) => command({ type: 'setLineDockyards', lineId: line.id, dockyards: n })}
                  label="Dockyards"
                />
                <span className={`small ${r.assigned < line.dockyards ? 'worse' : 'muted'}`}>
                  {r.assigned < line.dockyards ? `only ${r.assigned} available` : `dockyards (max ${r.cap})`}
                </span>
                <span className="small muted" title="Efficiency grows while the line runs; adding dockyards or retooling lowers it">
                  efficiency {pct(line.efficiency)}
                </span>
                {r.resourceFactor < 1 && <span className="small worse">short of resources: {pct(r.resourceFactor)} speed</span>}
              </div>
            </div>
          </div>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Fleets                                                              */
/* ------------------------------------------------------------------ */

function FleetPanel({ title, nation, side, industry }: { title: string; nation: NationState; side: 0 | 1; industry?: boolean }) {
  const groups = useMemo(() => {
    const m = new Map<string, { design: Design; count: number }>();
    for (const ship of nation.fleet) {
      const key = `${ship.design.id}|${ship.design.name}`;
      const g = m.get(key) ?? { design: ship.design, count: 0 };
      g.count += 1;
      m.set(key, g);
    }
    const order: HullClass[] = ['carrier', 'superHeavy', 'battleship', 'battlecruiser', 'heavyCruiser', 'lightCruiser', 'destroyer'];
    const rank = (d: Design) => order.indexOf(CTX.catalog.hulls.get(d.hullId)?.hullClass ?? 'destroyer');
    return [...m.values()].sort((a, b) => rank(a.design) - rank(b.design) || designYear(CTX.catalog, b.design) - designYear(CTX.catalog, a.design));
  }, [nation.fleet]);
  return (
    <Frame
      title={title}
      className={`fleet-list side-${side}`}
      actions={
        <span className="muted small">
          {nation.fleet.length} ships · {k(fleetValue(CTX, nation))} production
        </span>
      }
    >
      {industry && (
        <p className="muted small">
          Intelligence: {nation.civilianFactories} civilian factories, {nation.dockyards} dockyards, {nation.lines.length} production lines.
        </p>
      )}
      {groups.length === 0 && <p className="muted small">No ships.</p>}
      <div className="fleet-chips">
        {groups.map(({ design, count }) => {
          const hull = CTX.catalog.hulls.get(design.hullId);
          return (
            <div key={`${design.id}|${design.name}`} className="fleet-chip" title={hull ? HULL_CLASS_NAMES[hull.hullClass] : ''}>
              {hull && <ShipSilhouette kind={hull.hullClass} flip={side === 1} className="fleet-chip-sil" />}
              <span className="fleet-chip-count">{count}</span>
              <span className="fleet-chip-name">{design.name}</span>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}
