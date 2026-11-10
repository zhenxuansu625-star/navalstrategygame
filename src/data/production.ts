/** Production constants used to turn design cost into build time. */
export const PRODUCTION = {
  /** Production points one dockyard adds to a ship per day. */
  dockyardOutputPerDay: 2.5,
  /** Days in a campaign month, for monthly dockyard output. */
  daysPerMonth: 30,
  /** Dockyard count used for the "build time" estimate in the designer. */
  referenceDockyards: 5,
};
