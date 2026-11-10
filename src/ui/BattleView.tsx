import { useEffect, useMemo, useRef, useState } from 'react';
import { AGGRESSIVENESS, BATTLE_CONFIG } from '../data/battle';
import {
  createBattle,
  formatLogEvent,
  isPresent,
  logByHour,
  screeningRatio,
  step,
  type BattleSetup,
  type BattleState,
  type LogEvent,
  type ShipState,
  type SideIndex,
} from '../sim/battle';
import { createRng, rngFromState } from '../sim/rng';
import { ShipSilhouette, silhouetteFor } from './art/ShipSilhouette';
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
            <div className="clock-label">Naval engagement</div>
            <div className="clock-hour">
              Hour <span>{battle.hour}</span>
              <span className="muted"> / {BATTLE_CONFIG.maxHours}</span>
            </div>
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
        <div className="seed-row">
          <label>
            Seed{' '}
            <input type="number" value={seed} onChange={(e) => restart(Number(e.target.value) || 0)} />
          </label>
          <button onClick={() => restart(seed)}>Restart</button>
          <button onClick={() => restart(randomSeed())}>New random battle</button>
        </div>
      </Frame>

      {battle.result && (
        <div className={`result-banner ${battle.result.winner === 'draw' ? 'draw' : `side-${battle.result.winner}`}`}>
          <div className="result-title">
            {battle.result.winner === 'draw' ? 'Inconclusive' : `Victory for ${battle.sides[battle.result.winner].name}`}
          </div>
          <div className="result-sub">
            After {battle.result.hours} hours. {battle.result.reason}
          </div>
        </div>
      )}

      <div className="battle-field">
        <FleetPanel battle={battle} side={0} />
        <FleetPanel battle={battle} side={1} />
      </div>

      <div className="battle-lower">
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

function FleetPanel({ battle, side }: { battle: BattleState; side: SideIndex }) {
  const ships = battle.ships.filter((s) => s.side === side);
  const activeScreens = ships.filter((s) => s.status === 'active' && s.stats.line === 'screen').length;
  const capitals = ships.filter((s) => isPresent(s) && s.stats.line === 'capital').length;
  const ratio = screeningRatio(BATTLE_CONFIG, activeScreens, capitals);
  const sideState = battle.sides[side];
  const threshold = AGGRESSIVENESS[sideState.aggressiveness].retreatThreshold;
  return (
    <Frame
      className={`fleet-panel side-${side}`}
      title={sideState.name}
      actions={
        <span className="fleet-panel-meta">
          <span title={`${activeScreens} screens for ${capitals} capitals; target ${BATTLE_CONFIG.screening.screensPerCapital} per capital`}>
            Screening <strong className={ratio >= 1 ? 'better' : ratio < 0.5 ? 'worse' : ''}>{Math.round(ratio * 100)}%</strong>
          </span>
          <span>Retreat below {Math.round(threshold * 100)}%</span>
        </span>
      }
    >
      <LineRow title="Capital ships" ships={ships.filter((s) => s.stats.line === 'capital')} flip={side === 1} />
      <LineRow title="Screens" ships={ships.filter((s) => s.stats.line === 'screen')} flip={side === 1} />
    </Frame>
  );
}

function LineRow({ title, ships, flip }: { title: string; ships: ShipState[]; flip: boolean }) {
  if (ships.length === 0) return null;
  return (
    <div className="line">
      <div className="line-title">{title}</div>
      <div className="ships">
        {ships.map((s) => (
          <ShipTile key={s.id} ship={s} flip={flip} />
        ))}
      </div>
    </div>
  );
}

function ShipTile({ ship, flip }: { ship: ShipState; flip: boolean }) {
  const hp = ship.hp / ship.stats.hp;
  const org = ship.org / ship.stats.org;
  return (
    <div className={`ship-tile status-${ship.status}`} title={statTooltip(ship)}>
      <div className="ship-tile-head">
        <span className="ship-name">{ship.name}</span>
        {ship.status !== 'active' && <span className="ship-status">{statusLabel(ship)}</span>}
      </div>
      <ShipSilhouette kind={silhouetteFor(ship.hullClass, ship.stats.line)} flip={flip} className="ship-tile-sil" />
      <div className="ship-class">{ship.className}</div>
      <Bar kind="hp" value={hp} title={`HP ${Math.round(ship.hp)}/${ship.stats.hp}`} />
      <Bar kind="org" value={org} title={`Organisation ${Math.round(ship.org)}/${ship.stats.org}`} />
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
