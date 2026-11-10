import { useEffect, useMemo, useRef, useState } from 'react';
import { AGGRESSIVENESS, BATTLE_CONFIG } from '../data/battle';
import {
  createBattle,
  formatLogEvent,
  isPresent,
  logByHour,
  carrierCoverRatio,
  screeningRatio,
  step,
  type BattleSetup,
  type BattleState,
  type Line,
  type LogEvent,
  type ShipState,
  type SideIndex,
} from '../sim/battle';
import { createRng, rngFromState } from '../sim/rng';
import { ModuleIcon, type StatIconKind } from './art/ModuleIcon';
import { ShipSilhouette, silhouetteFor } from './art/ShipSilhouette';
import { groupShips, type ShipGroup } from './battleGroups';
import { Bar, Frame } from './components';

interface Run {
  battle: BattleState;
  rngState: number;
}

function newRun(setup: BattleSetup, seed: number): Run {
  return { battle: createBattle(setup), rngState: createRng(seed).getState() };
}

function advance(run: Run): Run {
  const rng = rngFromState(run.rngState);
  const battle = step(run.battle, {}, rng);
  return { battle, rngState: rng.getState() };
}

const randomSeed = () => Math.floor(Math.random() * 1_000_000);
const SPEEDS = [900, 450, 150];

export function BattleView({ setup }: { setup: BattleSetup }) {
  const [seed, setSeed] = useState(1);
  const [run, setRun] = useState<Run>(() => newRun(setup, 1));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const { battle } = run;

  // Restart whenever the fleets change.
  useEffect(() => {
    setRun(newRun(setup, seed));
    setPlaying(false);
  }, [setup]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return;
    if (battle.result) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setRun(advance), SPEEDS[speed]);
    return () => clearTimeout(t);
  }, [playing, battle, speed]);

  const restart = (s: number) => {
    setSeed(s);
    setRun(newRun(setup, s));
    setPlaying(false);
  };

  const runToEnd = () => {
    let r = run;
    while (!r.battle.result) r = advance(r);
    setRun(r);
    setPlaying(false);
  };

  const over = !!battle.result;

  return (
    <div className="battle-screen">
      <Frame className="battle-header">
        <div className="battle-header-grid">
          <SideBanner battle={battle} side={0} />
          <div className="battle-clock">
            {battle.result ? (
              <div className={`result-inline ${battle.result.winner === 'draw' ? 'draw' : `side-${battle.result.winner}`}`}>
                {battle.result.winner === 'draw' ? 'Inconclusive' : `${battle.sides[battle.result.winner].name} victorious`}
              </div>
            ) : (
              <div className="clock-hour">
                Hour <span>{battle.hour}</span>
              </div>
            )}
            <div className="battle-controls">
              <button onClick={() => setRun(advance)} disabled={over} title="Advance one hour">
                Step
              </button>
              <button className="primary" onClick={() => setPlaying((p) => !p)} disabled={over}>
                {playing ? '❚❚ Pause' : '▶ Play'}
              </button>
              <button onClick={() => setSpeed((s) => (s + 1) % SPEEDS.length)} title="Playback speed">
                {'»'.repeat(speed + 1)}
              </button>
              <button onClick={runToEnd} disabled={over} title="Resolve the rest of the battle instantly">
                Resolve
              </button>
            </div>
          </div>
          <SideBanner battle={battle} side={1} />
        </div>
        <TugBars battle={battle} />
        <FirepowerPanel battle={battle} />
        {battle.result && (
          <div className="result-reason">
            After {battle.result.hours} hours. {battle.result.reason}
          </div>
        )}
        <div className="seed-row">
          <label>
            Seed <input type="number" value={seed} onChange={(e) => restart(Number(e.target.value) || 0)} />
          </label>
          <button className="small-button" onClick={() => restart(seed)}>
            Restart
          </button>
          <button className="small-button" onClick={() => restart(randomSeed())}>
            Random
          </button>
        </div>
      </Frame>

      <EngagementBoard battle={battle} />

      <div className={`battle-lower ${battle.result ? 'with-report' : ''}`}>
        <Dispatch battle={battle} />
        {battle.result && <Report battle={battle} />}
      </div>
    </div>
  );
}

function sideTotals(battle: BattleState, side: SideIndex) {
  let hp = 0;
  let org = 0;
  let engaged = 0;
  let total = 0;
  for (const s of battle.ships) {
    if (s.side !== side) continue;
    total++;
    if (s.status === 'active') engaged++;
    if (isPresent(s)) {
      hp += s.hp;
      org += s.org;
    }
  }
  return { hp, org, engaged, total };
}

function SideBanner({ battle, side }: { battle: BattleState; side: SideIndex }) {
  const s = battle.sides[side];
  const t = sideTotals(battle, side);
  const lost = battle.ships.filter((x) => x.side === side && x.status === 'sunk').length;
  return (
    <div className={`side-banner side-${side}`}>
      <div className="side-flag" />
      <div>
        <div className="side-banner-name">{s.name}</div>
        <div className="side-banner-meta">
          {t.engaged}/{t.total} engaged · {lost} sunk · {AGGRESSIVENESS[s.aggressiveness].label}
        </div>
      </div>
    </div>
  );
}

interface Firepower {
  light: number;
  heavy: number;
  torpedo: number;
  planes: number;
  aa: number;
}

/** Combined attack of the ships still fighting on one side. */
function firepower(battle: BattleState, side: SideIndex): Firepower {
  const f: Firepower = { light: 0, heavy: 0, torpedo: 0, planes: 0, aa: 0 };
  for (const s of battle.ships) {
    if (s.side !== side) continue;
    if (isPresent(s)) f.aa += s.stats.aa;
    if (s.status !== 'active') continue;
    f.light += s.stats.lightAttack;
    f.heavy += s.stats.heavyAttack;
    f.torpedo += s.stats.torpedoAttack;
    f.planes += s.planes;
  }
  return f;
}

const FIREPOWER_ROWS: { key: keyof Firepower; label: string; icon: StatIconKind; hint: string }[] = [
  { key: 'light', label: 'Light guns', icon: 'lightBattery', hint: 'Light attack of ships still fighting: good against screens' },
  { key: 'heavy', label: 'Heavy guns', icon: 'heavyBattery', hint: 'Heavy attack of ships still fighting: good against capital ships' },
  { key: 'torpedo', label: 'Torpedoes', icon: 'torpedo', hint: 'Torpedo attack of ships still fighting' },
  { key: 'planes', label: 'Strike aircraft', icon: 'hangar', hint: 'Planes left on carriers that are still fighting; they strike every few hours' },
  { key: 'aa', label: 'Anti-air', icon: 'aa', hint: 'AA of ships still in the battle: cuts air-strike damage and shoots planes down' },
];

/** HOI4-style comparison of the two fleets' remaining firepower. */
function FirepowerPanel({ battle }: { battle: BattleState }) {
  const a = firepower(battle, 0);
  const b = firepower(battle, 1);
  const rows = FIREPOWER_ROWS.filter((r) => r.key !== 'planes' || a.planes + b.planes > 0 || battle.ships.some((s) => s.stats.airWing > 0));
  return (
    <div className="firepower">
      {rows.map((r) => {
        const x = Math.round(a[r.key]);
        const y = Math.round(b[r.key]);
        const share = x + y > 0 ? x / (x + y) : 0.5;
        return (
          <div key={r.key} className="fp-cell" title={r.hint}>
            <div className="fp-head">
              <ModuleIcon category={r.icon} className="fp-icon" />
              <span>{r.label}</span>
            </div>
            <div className="fp-values">
              <span className={`side-0-text ${x > y ? 'fp-lead' : ''}`}>{x}</span>
              <span className={`side-1-text ${y > x ? 'fp-lead' : ''}`}>{y}</span>
            </div>
            <div className="fp-bar">
              <div className="tug-fill side-0" style={{ width: `${share * 100}%` }} />
              <div className="tug-fill side-1" style={{ width: `${(1 - share) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TugBars({ battle }: { battle: BattleState }) {
  const a = sideTotals(battle, 0);
  const b = sideTotals(battle, 1);
  const row = (label: string, x: number, y: number) => {
    const share = x + y > 0 ? x / (x + y) : 0.5;
    return (
      <div className="tug">
        <span className="tug-value">{Math.round(x)}</span>
        <div className="tug-bar" title={`${label}: ${Math.round(share * 100)}% vs ${Math.round((1 - share) * 100)}%`}>
          <div className="tug-fill side-0" style={{ width: `${share * 100}%` }} />
          <div className="tug-fill side-1" style={{ width: `${(1 - share) * 100}%` }} />
          <span className="tug-label">{label}</span>
        </div>
        <span className="tug-value">{Math.round(y)}</span>
      </div>
    );
  };
  return (
    <div className="tugs">
      {row('Strength', a.hp, b.hp)}
      {row('Organisation', a.org, b.org)}
    </div>
  );
}

const BOARD_LINES: { line: Line; title: string }[] = [
  { line: 'carrier', title: 'Carriers' },
  { line: 'capital', title: 'Capital ships' },
  { line: 'screen', title: 'Screens' },
];

/** Both fleets side by side, one row per battle line, ships of a class condensed into one chip. */
function EngagementBoard({ battle }: { battle: BattleState }) {
  const [open, setOpen] = useState<string | null>(null);
  const cover = ([0, 1] as const).map((side) => {
    const ships = battle.ships.filter((s) => s.side === side);
    const screens = ships.filter((s) => s.status === 'active' && s.stats.line === 'screen').length;
    const capitals = ships.filter((s) => isPresent(s) && s.stats.line === 'capital').length;
    const activeCapitals = ships.filter((s) => s.status === 'active' && s.stats.line === 'capital').length;
    const carriers = ships.filter((s) => isPresent(s) && s.stats.line === 'carrier').length;
    return {
      screening: screeningRatio(BATTLE_CONFIG, screens, capitals + carriers),
      carrierCover: carrierCoverRatio(BATTLE_CONFIG, activeCapitals, carriers),
    };
  });
  const rows = BOARD_LINES.filter(({ line }) => battle.ships.some((s) => s.stats.line === line));
  return (
    <Frame className="board" title="Engagement">
      {rows.map(({ line, title }) => (
        <div key={line} className="board-row">
          <GroupCell battle={battle} side={0} line={line} open={open} setOpen={setOpen} />
          <div className="board-label">
            <div className="board-label-title">{title}</div>
            {line === 'screen' && (
              <div className="board-label-sub" title={`Target ${BATTLE_CONFIG.screening.screensPerCapital} screens per capital ship or carrier`}>
                <span className="side-0-text">{pctText(cover[0]!.screening)}</span>
                <span className="muted"> screening </span>
                <span className="side-1-text">{pctText(cover[1]!.screening)}</span>
              </div>
            )}
            {line === 'carrier' && (
              <div className="board-label-sub" title={`Target ${BATTLE_CONFIG.screening.capitalsPerCarrier} capital ship per carrier`}>
                <span className="side-0-text">{pctText(cover[0]!.carrierCover)}</span>
                <span className="muted"> cover </span>
                <span className="side-1-text">{pctText(cover[1]!.carrierCover)}</span>
              </div>
            )}
          </div>
          <GroupCell battle={battle} side={1} line={line} open={open} setOpen={setOpen} />
        </div>
      ))}
      <div className="board-legend muted">
        Big number: ships still fighting. <span className="st-retreat">↩</span> retreating{' '}
        <span className="st-sunk">†</span> sunk <span className="st-escaped">⇥</span> escaped ·{' '}
        <span className="legend-hp">■</span> HP <span className="legend-org">■</span> organisation · click a class to see its ships
      </div>
    </Frame>
  );
}

const pctText = (n: number) => `${Math.round(n * 100)}%`;

function GroupCell({
  battle,
  side,
  line,
  open,
  setOpen,
}: {
  battle: BattleState;
  side: SideIndex;
  line: Line;
  open: string | null;
  setOpen: (k: string | null) => void;
}) {
  const groups = groupShips(battle, side, line);
  return (
    <div className={`board-cell side-${side}`}>
      {groups.length === 0 && <span className="muted small board-empty">None</span>}
      {groups.map((g) => (
        <GroupChip key={g.key} group={g} open={open === g.key} onToggle={() => setOpen(open === g.key ? null : g.key)} />
      ))}
    </div>
  );
}

function GroupChip({ group: g, open, onToggle }: { group: ShipGroup; open: boolean; onToggle: () => void }) {
  const gone = g.active + g.retreating === 0;
  const flip = g.side === 1;
  return (
    <div className={`group ${open ? 'open' : ''} ${gone ? 'gone' : ''}`}>
      <button className="group-chip" onClick={onToggle} title={`${g.className}: ${g.active} of ${g.ships.length} still fighting. Click for details.`}>
        <ShipSilhouette kind={silhouetteFor(g.hullClass, g.line)} flip={flip} className="group-sil" />
        <span className="group-count">
          {g.active}
          {g.active !== g.ships.length && <span className="group-total">/{g.ships.length}</span>}
        </span>
        <span className="group-name">
          {g.line === 'carrier' && (
            <span className="group-planes" title="Strike aircraft left on this class's active carriers">
              ✈ {g.planes}{' '}
            </span>
          )}
          {g.className}
        </span>
        <span className="group-status">
          {g.retreating > 0 && <span className="st-retreat" title="Retreating">↩{g.retreating}</span>}
          {g.sunk > 0 && <span className="st-sunk" title="Sunk">†{g.sunk}</span>}
          {g.escaped > 0 && <span className="st-escaped" title="Escaped">⇥{g.escaped}</span>}
        </span>
        <span className="group-bars">
          <Bar kind="hp" value={g.hpFrac} title={`HP ${Math.round(g.hpFrac * 100)}% (ships still in battle)`} />
          <Bar kind="org" value={g.orgFrac} title={`Organisation ${Math.round(g.orgFrac * 100)}%`} />
        </span>
      </button>
      {open && (
        <div className="group-detail">
          {g.ships.map((s) => (
            <div key={s.id} className={`group-ship status-${s.status}`} title={statTooltip(s)}>
              <span className="group-ship-name">{s.name}</span>
              <span className="group-ship-status">{s.status === 'active' ? '' : statusLabel(s)}</span>
              <Bar kind="hp" value={s.hp / s.stats.hp} title={`HP ${Math.round(s.hp)}/${s.stats.hp}`} />
              <Bar kind="org" value={s.org / s.stats.org} title={`Organisation ${Math.round(s.org)}/${s.stats.org}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusLabel(ship: ShipState): string {
  switch (ship.status) {
    case 'retreating':
      return ship.retreatReason === 'org' ? 'Retreating' : 'Withdrawing';
    case 'escaped':
      return `Escaped h${ship.leftAtHour}`;
    case 'sunk':
      return `Sunk h${ship.leftAtHour}`;
    default:
      return '';
  }
}

function statTooltip(ship: ShipState): string {
  const s = ship.stats;
  return [
    `${ship.name} (${ship.className})`,
    `HP ${Math.round(ship.hp)}/${s.hp}, organisation ${Math.round(ship.org)}/${s.org}`,
    `Armour ${s.armour}`,
    `Light ${s.lightAttack} (pierce ${s.lightPiercing})`,
    `Heavy ${s.heavyAttack} (pierce ${s.heavyPiercing})`,
    `Torpedo ${s.torpedoAttack} (pierce ${s.torpedoPiercing})`,
    `Fire control +${Math.round(s.fireControl * 100)}%`,
    `Speed ${s.speed} kn, visibility ${s.visibility}`,
    `Anti-air ${s.aa}${s.airWing > 0 ? `, strike aircraft ${ship.planes}/${s.airWing}` : ''}`,
  ].join('\n');
}

function Dispatch({ battle }: { battle: BattleState }) {
  const hours = useMemo(() => [...logByHour(battle.log).entries()], [battle.log]);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [battle.log.length]);
  return (
    <section className="dispatch">
      <div className="dispatch-head">
        <span>Combat log</span>
        <span className="dispatch-stamp">Admiralty · urgent</span>
      </div>
      <div className="dispatch-body" ref={bodyRef}>
        {hours.map(([hour, events]) => (
          <div key={hour} className="log-hour">
            <div className="log-hour-title">Hour {hour}</div>
            {events.map((e, i) => (
              <div key={i} className={`log-event ${eventClass(e)}`}>
                {formatLogEvent(battle, e)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function eventClass(e: LogEvent): string {
  const side = 'side' in e ? ` side-${e.side}` : '';
  return `ev-${e.type}${side}`;
}

function Report({ battle }: { battle: BattleState }) {
  return (
    <Frame title="After-action report" className="report">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ship</th>
              <th>Fate</th>
              <th>Shots</th>
              <th>Hits</th>
              <th title="Hits that failed to pierce armour">Bounced</th>
              <th>Damage</th>
            </tr>
          </thead>
          <tbody>
            {battle.ships.map((s) => (
              <tr key={s.id} className={`side-${s.side}`}>
                <td>
                  {s.name} <span className="muted">{s.className}</span>
                </td>
                <td className={s.status === 'sunk' ? 'worse' : ''}>{s.status === 'active' ? 'Afloat' : statusLabel(s)}</td>
                <td>{s.shotsFired}</td>
                <td>{s.hits}</td>
                <td>{s.nonPiercingHits}</td>
                <td>{Math.round(s.damageDealt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}
