/** Helpers for balance experiments and tests: run AI-driven economies and compare the results. */
import { createBattle, runBattle } from '../battle/step';
import { createRng } from '../rng';
import { aiCommands } from './ai';
import type { EconomyContext } from './context';
import { nationDef } from './context';
import { fleetSide } from './fleet';
import { createGame, step } from './step';
import type { AiProfile, GameState, NationDef } from './types';

/** A plain nation with no traits, for comparing strategies on neutral ground. */
export const REFERENCE_NATION: NationDef = {
  id: 'reference',
  name: 'Reference',
  adjective: 'Reference',
  blurb: 'A medium power with no traits.',
  civilianFactories: 20,
  dockyards: 10,
  buildingSlots: 70,
  resources: { steel: 110, chromium: 6 },
  startingFleet: { battleship: 3, heavyCruiser: 1, lightCruiser: 3, destroyer: 6 },
  traits: [],
  ai: { transitionMonth: 24, fleetMix: { battleship: 3, battlecruiser: 1, carrier: 1, heavyCruiser: 1, lightCruiser: 2, destroyer: 3 } },
  shipNames: [],
};

/** The same context with one extra or replaced nation. */
export function withNation(ctx: EconomyContext, def: NationDef): EconomyContext {
  const nations = new Map(ctx.nations);
  nations.set(def.id, def);
  return { ...ctx, nations };
}

/** A copy of a nation with its traits removed. */
export function withoutTraits(def: NationDef): NationDef {
  return { ...def, traits: [] };
}

export interface RunOptions {
  nationId: string;
  startYear: number;
  months: number;
  /** Overrides the nation's own AI profile. */
  profile?: AiProfile;
  /** Called after each month with the state. */
  onMonth?: (state: GameState) => void;
}

/** Let the AI run one nation's economy for a number of months. The rival nation sits idle. */
export function runEconomy(ctx: EconomyContext, opts: RunOptions): GameState {
  const rivalId = [...ctx.nations.keys()].find((id) => id !== opts.nationId)!;
  const rng = createRng(1);
  let state = createGame(ctx, { playerId: opts.nationId, rivalId, startYear: opts.startYear });
  for (let m = 0; m < opts.months; m++) {
    state = step(state, { [opts.nationId]: aiCommands(ctx, state, opts.nationId, opts.profile) }, rng, ctx);
    opts.onMonth?.(state);
  }
  return state;
}

/** Ships launched plus work on the slips: a smooth measure of what the dockyards have delivered. */
export function navalOutput(state: GameState, nationId: string): number {
  const nation = state.nations[nationId]!;
  return nation.producedValue + nation.lines.reduce((n, l) => n + l.progress, 0);
}

/** Naval output by each horizon (months) when switching to dockyards at `transitionMonth`. */
export function producedByHorizon(
  ctx: EconomyContext,
  nationId: string,
  startYear: number,
  transitionMonth: number,
  horizons: readonly number[],
): number[] {
  const def = nationDef(ctx, nationId);
  const out: number[] = [];
  runEconomy(ctx, {
    nationId,
    startYear,
    months: Math.max(...horizons),
    profile: { ...def.ai, transitionMonth },
    onMonth: (s) => {
      if (horizons.includes(s.turn)) out[horizons.indexOf(s.turn)] = navalOutput(s, nationId);
    },
  });
  return out;
}

export interface Duel {
  winsA: number;
  winsB: number;
  draws: number;
}

/** Fight two campaign fleets against each other over several seeds. */
export function duel(ctx: EconomyContext, a: GameState, aId: string, b: GameState, bId: string, seeds: number): Duel {
  const setup = { sides: [fleetSide(ctx, a, aId), fleetSide(ctx, b, bId)] as [ReturnType<typeof fleetSide>, ReturnType<typeof fleetSide>] };
  const result: Duel = { winsA: 0, winsB: 0, draws: 0 };
  for (let seed = 1; seed <= seeds; seed++) {
    const winner = runBattle(createBattle(setup), createRng(seed)).result!.winner;
    if (winner === 0) result.winsA++;
    else if (winner === 1) result.winsB++;
    else result.draws++;
  }
  return result;
}
