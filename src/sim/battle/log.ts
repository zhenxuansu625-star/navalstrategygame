/** Turns structured battle log events into readable sentences. */
import type { AttackType, BattleState, LogEvent } from './types';

const WEAPON: Record<AttackType, string> = {
  light: 'light guns',
  heavy: 'heavy guns',
  torpedo: 'torpedoes',
};

const r = (n: number) => Math.round(n);

export function formatLogEvent(state: Pick<BattleState, 'sides'>, e: LogEvent): string {
  const side = (i: 0 | 1) => state.sides[i].name;
  switch (e.type) {
    case 'start':
      return e.text;
    case 'fire': {
      const screened = e.screened > 0 ? ` ${e.screened} shots at capitals were drawn off by screens.` : '';
      return `${side(e.side)}: ${e.hits}/${e.shots} hits for ${r(e.hpDamage)} damage and ${r(e.orgDamage)} organisation.${screened}`;
    }
    case 'bounce':
      return `${e.attacker}'s ${WEAPON[e.attackType]} (piercing ${e.piercing}) could not pierce ${e.target}'s armour (${e.armour}); ${e.attackerClass} ${WEAPON[e.attackType]} do little against a ${e.targetClass}.`;
    case 'sunk':
      return `${e.ship} (${side(e.side)}) sinks! Finished off by ${e.by}.`;
    case 'retreat':
      return `${e.ship} (${side(e.side)}) breaks off: ${e.reason === 'hp' ? 'heavy damage' : 'crew organisation collapsing'} (HP ${e.hpPct}%, org ${e.orgPct}%).`;
    case 'escaped':
      return `${e.ship} (${side(e.side)}) escapes the battle.`;
    case 'end':
      return e.winner === 'draw'
        ? `Battle over: inconclusive. ${e.reason}`
        : `Battle over: ${side(e.winner)} wins. ${e.reason}`;
  }
}

/** Group log events by hour for display. */
export function logByHour(log: readonly LogEvent[]): Map<number, LogEvent[]> {
  const out = new Map<number, LogEvent[]>();
  for (const e of log) {
    const list = out.get(e.hour) ?? [];
    list.push(e);
    out.set(e.hour, list);
  }
  return out;
}
