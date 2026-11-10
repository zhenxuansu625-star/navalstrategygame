/** Technology eras used to name preset designs: "<tier> <ship type>". */
export interface Era {
  id: 'pre' | 'early' | 'basic' | 'improved' | 'advanced';
  /** Name prefix, e.g. "Early" in "Early Battleship". */
  tier: string;
  /** Description of the period. */
  period: string;
  /** First tech year of the era (inclusive). */
  from: number;
}

export const ERAS: readonly Era[] = [
  { id: 'pre', tier: 'Pre-dreadnought', period: 'before the First World War', from: 0 },
  { id: 'early', tier: 'Early', period: 'First World War', from: 1906 },
  { id: 'basic', tier: 'Basic', period: 'interwar', from: 1919 },
  { id: 'improved', tier: 'Improved', period: 'late 1930s', from: 1938 },
  { id: 'advanced', tier: 'Advanced', period: 'Second World War', from: 1942 },
];

/** The era a tech year belongs to. */
export function eraOf(year: number): Era {
  let found = ERAS[0]!;
  for (const era of ERAS) if (year >= era.from) found = era;
  return found;
}
