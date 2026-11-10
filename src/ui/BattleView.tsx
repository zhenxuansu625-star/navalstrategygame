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

export function BattleView({ setup }: { setup: BattleSetup }) {
  const [seed, setSeed] = useState(1);
  const [run, setRun] = useState<Run>(() => newRun(setup, 1));
  const [playing, setPlaying] = useState(false);
  const { battle } = run;

  // Restart whenever the fleets change.
  useEffect(() => {
    setRun(newRun(setup, seed));
    setPlaying(false);
  }, [setup]);

  useEffect(() => {
    if (!playing) return;
    if (battle.result) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setRun(advance), 450);
    return () => clearTimeout(t);
  }, [playing, battle]);

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

  return (
    <div className="battle">
      <div className="controls">
        <label>
          Seed{' '}
          <input
            type="number"
            value={seed}
            onChange={(e) => restart(Number(e.target.value) || 0)}
          />
        </label>
        <button onClick={() => restart(randomSeed())}>New random battle</button>
        <button onClick={() => restart(seed)}>Restart</button>
        <span className="divider" />
        <button onClick={() => setRun(advance)} disabled={!!battle.result}>
          Step 1 hour
        </button>
        <button onClick={() => setPlaying((p) => !p)} disabled={!!battle.result}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={runToEnd} disabled={!!battle.result}>
          Resolve
        </button>
        <span className="hour">Hour {battle.hour}</span>
      </div>

      {battle.result && (
        <div className={`result ${battle.result.winner === 'draw' ? 'draw' : `side-${battle.result.winner}`}`}>
          {battle.result.winner === 'draw'
            ? 'Inconclusive'
            : `${battle.sides[battle.result.winner].name} wins`}{' '}
          after {battle.result.hours} hours. {battle.result.reason}
        </div>
      )}

      <div className="fleets">
        <FleetPanel battle={battle} side={0} />
        <FleetPanel battle={battle} side={1} />
      </div>

      <div className="lower">
        <BattleLog battle={battle} />
        {battle.result && <Report battle={battle} />}
      </div>
    </div>
  );
}

function FleetPanel({ battle, side }: { battle: BattleState; side: SideIndex }) {
  const ships = battle.ships.filter((s) => s.side === side);
  const activeScreens = ships.filter((s) => s.status === 'active' && s.stats.line === 'screen').length;
  const capitals = ships.filter((s) => isPresent(s) && s.stats.line === 'capital').length;
  const ratio = screeningRatio(BATTLE_CONFIG, activeScreens, capitals);
  const sideState = battle.sides[side];
  return (
    <section className={`fleet side-${side}`}>
      <h2>{sideState.name}</h2>
      <div className="fleet-meta">
        <span>{AGGRESSIVENESS[sideState.aggressiveness].label}: retreat below {Math.round(AGGRESSIVENESS[sideState.aggressiveness].retreatThreshold * 100)}%</span>
        <span title={`${activeScreens} active screens for ${capitals} capitals (target ${BATTLE_CONFIG.screening.screensPerCapital} per capital)`}>
          Screening {Math.round(ratio * 100)}%
        </span>
      </div>
      <LineRow title="Capitals" ships={ships.filter((s) => s.stats.line === 'capital')} />
      <LineRow title="Screens" ships={ships.filter((s) => s.stats.line === 'screen')} />
    </section>
  );
}

function LineRow({ title, ships }: { title: string; ships: ShipState[] }) {
  if (ships.length === 0) return null;
  return (
    <div className="line">
      <h3>{title}</h3>
      <div className="ships">
        {ships.map((s) => (
          <ShipCard key={s.id} ship={s} />
        ))}
      </div>
    </div>
  );
}

function ShipCard({ ship }: { ship: ShipState }) {
  const hp = ship.hp / ship.stats.hp;
  const org = ship.org / ship.stats.org;
  return (
    <div className={`ship status-${ship.status}`} title={statTooltip(ship)}>
      <div className="ship-head">
        <span className="ship-name">{ship.name}</span>
        <span className="ship-class">{ship.className}</span>
      </div>
      <Bar label="HP" value={hp} text={`${Math.round(ship.hp)}/${ship.stats.hp}`} kind="hp" />
      <Bar label="Org" value={org} text={`${Math.round(ship.org)}/${ship.stats.org}`} kind="org" />
      {ship.status !== 'active' && <div className="badge">{statusLabel(ship)}</div>}
    </div>
  );
}

function statusLabel(ship: ShipState): string {
  switch (ship.status) {
    case 'retreating':
      return ship.retreatReason === 'org' ? 'Retreating (org)' : 'Retreating (damage)';
    case 'escaped':
      return `Escaped (h${ship.leftAtHour})`;
    case 'sunk':
      return `Sunk (h${ship.leftAtHour})`;
    default:
      return '';
  }
}

function statTooltip(ship: ShipState): string {
  const s = ship.stats;
  return [
    `Armour ${s.armour}`,
    `Light ${s.lightAttack} (pierce ${s.lightPiercing})`,
    `Heavy ${s.heavyAttack} (pierce ${s.heavyPiercing})`,
    `Torpedo ${s.torpedoAttack} (pierce ${s.torpedoPiercing})`,
    `Fire control +${Math.round(s.fireControl * 100)}%`,
    `Speed ${s.speed} kn, visibility ${s.visibility}`,
  ].join('\n');
}

function Bar({ label, value, text, kind }: { label: string; value: number; text: string; kind: 'hp' | 'org' }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className={`bar ${kind}`}>
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-text">{text}</span>
    </div>
  );
}

function BattleLog({ battle }: { battle: BattleState }) {
  const hours = useMemo(() => [...logByHour(battle.log).entries()], [battle.log]);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [battle.log.length]);
  return (
    <section className="log">
      <h2>Hourly log</h2>
      <div className="log-body" ref={bodyRef}>
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
    <section className="report">
      <h2>After-action report</h2>
      <table>
        <thead>
          <tr>
            <th>Ship</th>
            <th>Fate</th>
            <th>Shots</th>
            <th>Hits</th>
            <th title="Hits that failed to pierce armour">Bounced</th>
            <th>Damage dealt</th>
          </tr>
        </thead>
        <tbody>
          {battle.ships.map((s) => (
            <tr key={s.id} className={`side-${s.side}`}>
              <td>
                {s.name} <span className="muted">{s.className}</span>
              </td>
              <td>{s.status === 'active' ? 'Afloat' : statusLabel(s)}</td>
              <td>{s.shotsFired}</td>
              <td>{s.hits}</td>
              <td>{s.nonPiercingHits}</td>
              <td>{Math.round(s.damageDealt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
