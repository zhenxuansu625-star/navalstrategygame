import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AGGRESSIVENESS, type AggressivenessId } from '../data/battle';
import { BUILDING_NAMES, ECONOMY, MONTH_NAMES } from '../data/economy';
import { HULL_CLASS_NAMES } from '../data/hulls';
import type { BattleSetup, BattleState } from '../sim/battle';
import { designCost, designYear, type Design, type HullClass } from '../sim/designer';
import {
  aiCommands,
  applyBattleResult,
  applyCommand,
  DEFAULT_CONTEXT as CTX,
  designProblem,
  fleetBattleSetup,
  fleetValue,
  freeSlots,
  industryReport,
  infrastructureCost,
  lineCap,
  nationDef,
  nationName,
  repairBerths,
  resolveModifiers,
  shipMax,
  shipsInDock,
  stepDay,
  type BuildingType,
  type Command,
  type GameDate,
  type GameState,
  type NationState,
  type ResourceType,
  type ShipRecord,
} from '../sim/economy';
import { rngFromState } from '../sim/rng';
import { ShipSilhouette } from './art/ShipSilhouette';
import { BattleView } from './BattleView';
import { TraitList } from './CampaignStart';
import { Bar, Frame } from './components';
import { pct } from './format';

export interface Campaign {
  game: GameState;
  rngState: number;
}

const formatDate = (d: GameDate) => `${d.day ?? 1} ${MONTH_NAMES[d.month - 1]} ${d.year}`;
const k = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

/** Game days per real second at each clock speed (0 = paused). */
const SPEEDS = [0, 1.5, 4, 10, 25, 60];

export function CampaignView({
  campaign,
  setCampaign,
  designs,
}: {
  campaign: Campaign;
  setCampaign: (c: Campaign | ((prev: Campaign) => Campaign)) => void;
  designs: Design[];
}) {
  return <CampaignScreen campaign={campaign} setCampaign={setCampaign} designs={designs} />;
}

/** One day for the whole campaign: the rival's AI gives its orders on the first of each month. */
function advanceOneDay(c: Campaign): Campaign {
  const rng = rngFromState(c.rngState);
  const g = c.game;
  const orders = (g.date.day ?? 1) === 1 ? { [g.rivalId]: aiCommands(CTX, g, g.rivalId) } : {};
  return { game: stepDay(g, orders, rng, CTX), rngState: rng.getState() };
}

/** The campaign clock: runs whole days at the chosen speed, a few per frame at most. */
function useCampaignClock(speed: number, running: boolean, setCampaign: (fn: (c: Campaign) => Campaign) => void) {
  useEffect(() => {
    if (!running || speed <= 0) return;
    let frame = 0;
    let last = performance.now();
    let owed = 0;
    const tick = (now: number) => {
      owed += ((now - last) / 1000) * SPEEDS[speed]!;
      last = now;
      const days = Math.min(4, Math.floor(owed));
      if (days > 0) {
        owed -= days;
        setCampaign((c) => {
          let next = c;
          for (let i = 0; i < days; i++) next = advanceOneDay(next);
          return next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [speed, running, setCampaign]);
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
  setCampaign: (c: Campaign | ((prev: Campaign) => Campaign)) => void;
  designs: Design[];
}) {
  const { game } = campaign;
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(0);
  const [lastSpeed, setLastSpeed] = useState(2);
  /** The war game's fleets, frozen when it starts so the clock cannot change them mid-battle. */
  const [warGame, setWarGame] = useState<{ setup: BattleSetup; applied: boolean } | null>(null);
  const player = game.nations[game.playerId]!;
  const rival = game.nations[game.rivalId]!;
  const playerDef = nationDef(CTX, game.playerId);
  const playerName = nationName(CTX, game, game.playerId);
  const rivalName = nationName(CTX, game, game.rivalId);
  const report = useMemo(() => industryReport(CTX, player), [player]);

  const setFn = useCallback((fn: (c: Campaign) => Campaign) => setCampaign(fn), [setCampaign]);
  useCampaignClock(speed, !warGame, setFn);

  const togglePause = useCallback(() => {
    setSpeed((sp) => {
      if (sp > 0) {
        setLastSpeed(sp);
        return 0;
      }
      return lastSpeed;
    });
  }, [lastSpeed]);

  // HOI4-style keys: space pauses, + and - change speed.
  const keyRef = useRef({ togglePause });
  keyRef.current.togglePause = togglePause;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        keyRef.current.togglePause();
      } else if (e.key === '+' || e.key === '=') setSpeed((sp) => Math.min(5, Math.max(1, sp + 1)));
      else if (e.key === '-' || e.key === '_') setSpeed((sp) => Math.max(1, sp - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const command = (cmd: Command) => {
    const result = applyCommand(CTX, game, game.playerId, cmd);
    setError(result.error ?? null);
    if (!result.error) setCampaign({ ...campaign, game: result.state });
  };

  const startWarGame = () => {
    setSpeed(0);
    setWarGame({ setup: fleetBattleSetup(CTX, game, game.playerId, game.rivalId), applied: false });
  };

  const onBattleFinished = useCallback(
    (battle: BattleState) => {
      setWarGame((w) => {
        if (!w || w.applied) return w;
        setCampaign((c) => ({ ...c, game: applyBattleResult(CTX, c.game, battle, [c.game.playerId, c.game.rivalId]) }));
        return { ...w, applied: true };
      });
    },
    [setCampaign],
  );

  return (
    <div className="campaign">
      <Frame className="campaign-header">
        <div className="campaign-top">
          <div>
            <div className="campaign-nation">{playerName.name}</div>
            <div className="muted small">
              Rival: {rivalName.name} · month {game.turn + 1}
            </div>
          </div>
          <div className="campaign-clock">
            <div className="campaign-date">{formatDate(game.date)}</div>
            <div className="speed-controls" role="group" aria-label="Game speed">
              <button
                className={`pause-button ${speed === 0 ? 'paused' : ''}`}
                onClick={togglePause}
                disabled={!!warGame}
                title="Pause or resume (space)"
              >
                {speed === 0 ? '▶' : '❚❚'}
              </button>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`speed-pip ${speed > 0 && n <= speed ? 'on' : ''} ${speed === 0 && n <= lastSpeed ? 'dim' : ''}`}
                  onClick={() => {
                    setSpeed(n);
                    setLastSpeed(n);
                  }}
                  disabled={!!warGame}
                  title={`Speed ${n}: ${SPEEDS[n]} days per second (+ and - change speed)`}
                  aria-label={`Speed ${n}`}
                />
              ))}
            </div>
            <div className="muted small clock-state">{warGame ? 'Paused for the war game' : speed === 0 ? 'Paused' : `Speed ${speed}`}</div>
          </div>
          <div className="campaign-actions">
            <button onClick={() => setCampaign(advanceOneDay(campaign))} disabled={speed > 0 || !!warGame} title="Advance one day">
              +1 day
            </button>
          </div>
        </div>
        <IndustryStrip nation={player} report={report} />
        <TraitList def={playerDef} />
        {error && <div className="problems-line">{error}</div>}
      </Frame>

      <div className="campaign-columns">
        <ConstructionPanel nation={player} report={report} command={command} />
        <ProductionPanel game={game} nation={player} report={report} designs={designs} command={command} />
      </div>

      <div className="campaign-columns">
        <FleetPanel title={`${playerName.adjective} Navy`} nation={player} side={0} command={command} />
        <FleetPanel title={`${rivalName.adjective} Navy (rival)`} nation={rival} side={1} industry />
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
            {warGame ? (
              <button onClick={() => setWarGame(null)}>{warGame.applied ? 'Close' : 'Abandon'}</button>
            ) : (
              <button className="primary" onClick={startWarGame}>
                Fight the {rivalName.adjective} Navy
              </button>
            )}
          </>
        }
      >
        <p className="muted small war-game-hint">
          Both fleets fight as they stand: damaged ships fight damaged, ships in dock stay in port. Ships sunk are lost and the
          survivors keep their damage; send them to dock to repair. The clock pauses while the battle is on.
        </p>
        {warGame?.applied && <div className="notice">Result recorded. Survivors keep their damage: repair them from the fleet panel.</div>}
      </Frame>
      {warGame && <BattleView setup={warGame.setup} onFinish={onBattleFinished} />}

      <Frame title="Dispatches" className="events">
        {game.events.length === 0 && <p className="muted small">Nothing to report yet. Unpause the clock to begin.</p>}
        <ul>
          {game.events
            .filter((e) => e.nationId === game.playerId || e.kind === 'launch' || e.kind === 'battle')
            .reverse()
            .slice(0, 14)
            .map((e, i) => (
              <li key={i} className={e.nationId === game.playerId ? 'side-0-text' : 'side-1-text'}>
                <span className="muted">{formatDate(e.date)}</span> {nationName(CTX, game, e.nationId).name}: {e.text}
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
        const rate = factories * cfg.outputPerFactory * ECONOMY.pace * Math.max(0, 1 + mods.constructionSpeed[item.building]);
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

function FleetPanel({
  title,
  nation,
  side,
  industry,
  command,
}: {
  title: string;
  nation: NationState;
  side: 0 | 1;
  industry?: boolean;
  /** Present for the player's own fleet: enables repair orders. */
  command?: (c: Command) => void;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, { design: Design; count: number; damaged: number; inDock: number }>();
    for (const ship of nation.fleet) {
      const key = `${ship.design.id}|${ship.design.name}`;
      const g = m.get(key) ?? { design: ship.design, count: 0, damaged: 0, inDock: 0 };
      g.count += 1;
      if (ship.hp !== undefined) g.damaged += 1;
      if (ship.repairing) g.inDock += 1;
      m.set(key, g);
    }
    const order: HullClass[] = ['carrier', 'superHeavy', 'battleship', 'battlecruiser', 'heavyCruiser', 'lightCruiser', 'destroyer', 'submarine'];
    const rank = (d: Design) => order.indexOf(CTX.catalog.hulls.get(d.hullId)?.hullClass ?? 'destroyer');
    return [...m.values()].sort((a, b) => rank(a.design) - rank(b.design) || designYear(CTX.catalog, b.design) - designYear(CTX.catalog, a.design));
  }, [nation.fleet]);
  const damaged = nation.fleet.filter((s) => s.hp !== undefined || s.org !== undefined);
  const dock = new Set(shipsInDock(CTX, nation).map((s) => s.id));
  const berths = repairBerths(CTX, nation);
  const anyRepairing = nation.fleet.some((s) => s.repairing);
  const needsRepair = nation.fleet.some((s) => s.hp !== undefined && !s.repairing);
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
          Intelligence: {nation.civilianFactories} civilian factories, {nation.dockyards} dockyards, {nation.lines.length} production lines
          {damaged.length > 0 ? `, ${damaged.length} ships damaged` : ''}.
        </p>
      )}
      {groups.length === 0 && <p className="muted small">No ships.</p>}
      <div className="fleet-chips">
        {groups.map(({ design, count, damaged: hurt, inDock }) => {
          const hull = CTX.catalog.hulls.get(design.hullId);
          return (
            <div key={`${design.id}|${design.name}`} className="fleet-chip" title={hull ? HULL_CLASS_NAMES[hull.hullClass] : ''}>
              {hull && <ShipSilhouette kind={hull.hullClass} flip={side === 1} className="fleet-chip-sil" />}
              <span className="fleet-chip-count">{count}</span>
              <span className="fleet-chip-name">
                {design.name}
                {hurt > 0 && <span className="fleet-chip-hurt"> · {hurt} damaged{inDock > 0 ? `, ${inDock} in dock` : ''}</span>}
              </span>
            </div>
          );
        })}
      </div>

      {command && (
        <div className="repair-panel">
          <div className="repair-head">
            <span className="panel-heading-inline">Repairs</span>
            <span className="muted small">
              {berths} berths · {dock.size} in dock
            </span>
            <span className="row-buttons">
              <button onClick={() => command({ type: 'setRepair', ships: 'damaged', repairing: true })} disabled={!needsRepair}>
                Repair all
              </button>
              <button className="danger" onClick={() => command({ type: 'setRepair', ships: 'all', repairing: false })} disabled={!anyRepairing}>
                Cancel repairs
              </button>
            </span>
          </div>
          {damaged.length === 0 ? (
            <p className="muted small">The whole fleet is at full strength.</p>
          ) : (
            <div className="damaged-list">
              {damaged.map((ship) => (
                <DamagedShip key={ship.id} nationId={nation.id} ship={ship} inDock={dock.has(ship.id)} command={command} />
              ))}
            </div>
          )}
        </div>
      )}
    </Frame>
  );
}

function DamagedShip({
  nationId,
  ship,
  inDock,
  command,
}: {
  nationId: string;
  ship: ShipRecord;
  inDock: boolean;
  command: (c: Command) => void;
}) {
  const max = shipMax(CTX, nationId, ship);
  const hp = (ship.hp ?? max.hp) / max.hp;
  const org = (ship.org ?? max.org) / max.org;
  const status = ship.repairing ? (inDock ? 'In dock' : 'Waiting for a berth') : ship.hp !== undefined ? 'Damaged' : 'Recovering';
  const months = inDock && ship.hp !== undefined ? Math.ceil(((1 - hp) / (ECONOMY.repair.hpPerMonth * ECONOMY.pace)) * 30) : null;
  return (
    <div className={`damaged-ship ${ship.repairing ? 'repairing' : ''}`}>
      <div className="damaged-ship-head">
        <span className="damaged-ship-name">{ship.name}</span>
        <span className="muted small">{ship.design.name}</span>
        <span className={`small damaged-status ${inDock ? 'better' : ship.repairing ? '' : 'worse'}`}>
          {status}
          {months ? ` · ${months} days` : ''}
        </span>
        {ship.hp !== undefined && (
          <button
            className="icon-button"
            onClick={() => command({ type: 'setRepair', ships: [ship.id], repairing: !ship.repairing })}
            title={ship.repairing ? 'Recall from dock: the ship can fight again, still damaged' : 'Send to dock: the ship sits out battles while it repairs'}
          >
            {ship.repairing ? 'Recall' : 'Repair'}
          </button>
        )}
      </div>
      <Bar kind="hp" value={hp} title={`HP ${Math.round(hp * 100)}%`} />
      <Bar kind="org" value={org} title={`Organisation ${Math.round(org * 100)}%`} />
    </div>
  );
}
