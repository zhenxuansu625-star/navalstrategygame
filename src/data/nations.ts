/**
 * The historical naval powers. Starting values are game-balance numbers, tuned
 * for play rather than taken from historical statistics (docs/02).
 */
import type { NationDef } from '../sim/economy/types';

export const NATIONS: NationDef[] = [
  {
    id: 'uk',
    name: 'United Kingdom',
    adjective: 'British',
    blurb: 'Largest fleet and dockyards, but an empire to pay for.',
    civilianFactories: 26,
    dockyards: 18,
    buildingSlots: 90,
    resources: { steel: 150, chromium: 8 },
    startingFleet: { battleship: 6, battlecruiser: 2, heavyCruiser: 2, lightCruiser: 6, destroyer: 12 },
    traits: [
      {
        id: 'royal_dockyards', name: 'Royal Dockyards', kind: 'strength',
        description: 'Battleships and battlecruisers build 10% faster.',
        modifiers: { dockyardOutput: { battleship: 0.1, battlecruiser: 0.1, superHeavy: 0.1 } },
      },
      {
        id: 'imperial_commitments', name: 'Imperial commitments', kind: 'weakness',
        description: 'Consumer goods take 4 points more of the civilian factories.',
        modifiers: { consumerGoods: 0.04 },
      },
    ],
    ai: { transitionMonth: 12, fleetMix: { battleship: 4, battlecruiser: 1, carrier: 1, heavyCruiser: 1, lightCruiser: 2, destroyer: 3 } },
    shipNames: ['Dreadnought', 'Warspite', 'Valiant', 'Revenge', 'Lion', 'Tiger', 'Ajax', 'Orion', 'Hood', 'Renown', 'Nelson', 'Rodney', 'Ark Royal', 'Illustrious', 'Vanguard', 'Monarch', 'Thunderer', 'Conqueror', 'Centurion', 'Benbow'],
  },
  {
    id: 'germany',
    name: 'Germany',
    adjective: 'German',
    blurb: 'Strong civilian industry and sturdy ships, but few dockyards to start.',
    civilianFactories: 28,
    dockyards: 10,
    buildingSlots: 86,
    resources: { steel: 140, chromium: 4 },
    startingFleet: { battleship: 4, battlecruiser: 1, heavyCruiser: 1, lightCruiser: 4, destroyer: 8 },
    traits: [
      {
        id: 'industrial_heartland', name: 'Industrial heartland', kind: 'strength',
        description: 'Civilian factories are built 12% faster.',
        modifiers: { constructionSpeed: { civilianFactory: 0.12 } },
      },
      {
        id: 'krupp_engineering', name: 'Krupp engineering', kind: 'strength',
        description: 'Ships have 4% more HP: honeycomb subdivision keeps them afloat.',
        modifiers: { shipStats: { hp: 0.04 } },
      },
      {
        id: 'uboat_arm', name: 'U-boat arm', kind: 'strength',
        description: 'Submarines build 30% faster.',
        modifiers: { dockyardOutput: { submarine: 0.3 } },
        inactive: 'Takes effect when submarines are added (roadmap slice 9).',
      },
    ],
    ai: { transitionMonth: 30, fleetMix: { battleship: 3, battlecruiser: 2, carrier: 0.5, heavyCruiser: 1, lightCruiser: 2, destroyer: 3 } },
    shipNames: ['Konig', 'Kaiser', 'Bayern', 'Baden', 'Seydlitz', 'Derfflinger', 'Moltke', 'Von der Tann', 'Lutzow', 'Hindenburg', 'Bismarck', 'Tirpitz', 'Scharnhorst', 'Gneisenau', 'Emden', 'Dresden', 'Nurnberg', 'Leipzig', 'Koln', 'Karlsruhe'],
  },
  {
    id: 'usa',
    name: 'United States',
    adjective: 'American',
    blurb: 'Huge industrial potential and resources, slowed by a peacetime economy.',
    civilianFactories: 32,
    dockyards: 8,
    buildingSlots: 120,
    resources: { steel: 240, chromium: 14 },
    startingFleet: { battleship: 3, heavyCruiser: 2, lightCruiser: 3, destroyer: 8 },
    traits: [
      {
        id: 'carrier_yards', name: 'Carrier yards', kind: 'strength',
        description: 'Aircraft carriers build 25% faster.',
        modifiers: { dockyardOutput: { carrier: 0.25 } },
      },
      {
        id: 'mass_production', name: 'Mass production', kind: 'strength',
        description: 'Production lines gain efficiency 30% faster.',
        modifiers: { lineEfficiencyGain: 0.3 },
      },
      {
        id: 'peacetime_economy', name: 'Peacetime economy', kind: 'weakness',
        description: 'Consumer goods take 8 points more of the civilian factories.',
        modifiers: { consumerGoods: 0.08 },
      },
    ],
    ai: { transitionMonth: 48, fleetMix: { battleship: 3, carrier: 3, heavyCruiser: 1, lightCruiser: 2, destroyer: 3 } },
    shipNames: ['Texas', 'Nevada', 'Arizona', 'Pennsylvania', 'Lexington', 'Saratoga', 'Enterprise', 'Yorktown', 'Hornet', 'Iowa', 'Missouri', 'Washington', 'Essex', 'Atlanta', 'Portland', 'Houston', 'Fletcher', 'Benson', 'Sims', 'Porter'],
  },
  {
    id: 'france',
    name: 'France',
    adjective: 'French',
    blurb: 'A solid fleet with a taste for cruisers and torpedo craft.',
    civilianFactories: 20,
    dockyards: 10,
    buildingSlots: 66,
    resources: { steel: 90, chromium: 4 },
    startingFleet: { battleship: 3, heavyCruiser: 2, lightCruiser: 4, destroyer: 8 },
    traits: [
      {
        id: 'jeune_ecole', name: 'Jeune École', kind: 'strength',
        description: 'Destroyers and light cruisers build 8% faster.',
        modifiers: { dockyardOutput: { destroyer: 0.08, lightCruiser: 0.08 } },
      },
      {
        id: 'colonial_trade', name: 'Colonial trade', kind: 'strength',
        description: 'Each factory on trade brings in 20% more resources.',
        modifiers: { tradeYield: 0.2 },
      },
    ],
    ai: { transitionMonth: 18, fleetMix: { battleship: 2, heavyCruiser: 2, carrier: 0.5, lightCruiser: 3, destroyer: 4 } },
    shipNames: ['Bretagne', 'Provence', 'Lorraine', 'Courbet', 'Dunkerque', 'Strasbourg', 'Richelieu', 'Jean Bart', 'Algerie', 'Colbert', 'Foch', 'Duquesne', 'Gloire', 'Marseillaise', 'Bearn', 'Mogador', 'Volta', 'Le Fantasque', 'Le Terrible', 'Jaguar'],
  },
  {
    id: 'japan',
    name: 'Japan',
    adjective: 'Japanese',
    blurb: 'A focused navy with a deadly torpedo tradition, short of steel.',
    civilianFactories: 15,
    dockyards: 10,
    buildingSlots: 52,
    resources: { steel: 55, chromium: 2 },
    startingFleet: { battleship: 3, battlecruiser: 1, heavyCruiser: 1, lightCruiser: 3, destroyer: 8 },
    traits: [
      {
        id: 'long_lance', name: 'Torpedo tradition', kind: 'strength',
        description: 'Ships have 15% more torpedo attack.',
        modifiers: { shipStats: { torpedoAttack: 0.15 } },
      },
      {
        id: 'kido_butai', name: 'Carrier striking force', kind: 'strength',
        description: 'Aircraft carriers build 12% faster.',
        modifiers: { dockyardOutput: { carrier: 0.12 } },
      },
    ],
    ai: { transitionMonth: 6, fleetMix: { battleship: 2, battlecruiser: 1, carrier: 2, heavyCruiser: 2, lightCruiser: 1, destroyer: 4 } },
    shipNames: ['Kongo', 'Hiei', 'Fuso', 'Yamashiro', 'Nagato', 'Mutsu', 'Akagi', 'Kaga', 'Soryu', 'Hiryu', 'Yamato', 'Musashi', 'Takao', 'Atago', 'Mogami', 'Tone', 'Fubuki', 'Kagero', 'Yukikaze', 'Shimakaze'],
  },
  {
    id: 'italy',
    name: 'Italy',
    adjective: 'Italian',
    blurb: 'Fast ships and a central position, held back by weak industry.',
    civilianFactories: 13,
    dockyards: 8,
    buildingSlots: 80,
    resources: { steel: 40, chromium: 2 },
    startingFleet: { battleship: 2, heavyCruiser: 2, lightCruiser: 3, destroyer: 6 },
    traits: [
      {
        id: 'fast_ships', name: 'Built for speed', kind: 'strength',
        description: 'Ships are 2% faster, and cruisers build 8% faster.',
        modifiers: { shipStats: { speed: 0.02 }, dockyardOutput: { heavyCruiser: 0.08, lightCruiser: 0.08 } },
      },
      {
        id: 'weak_industry', name: 'Weak industry', kind: 'weakness',
        description: 'Civilian factories are built 10% slower.',
        modifiers: { constructionSpeed: { civilianFactory: -0.1 } },
      },
    ],
    ai: { transitionMonth: 12, fleetMix: { battleship: 2, heavyCruiser: 3, lightCruiser: 3, destroyer: 3 } },
    shipNames: ['Cavour', 'Cesare', 'Doria', 'Duilio', 'Littorio', 'Vittorio Veneto', 'Roma', 'Zara', 'Pola', 'Fiume', 'Gorizia', 'Trento', 'Trieste', 'Bolzano', 'Montecuccoli', 'Aosta', 'Garibaldi', 'Maestrale', 'Oriani', 'Soldati'],
  },
  {
    id: 'russia',
    name: 'Russia',
    adjective: 'Russian',
    blurb: 'Vast potential and resources, with slow, scattered dockyards.',
    civilianFactories: 20,
    dockyards: 6,
    buildingSlots: 44,
    resources: { steel: 120, chromium: 12 },
    startingFleet: { battleship: 3, heavyCruiser: 1, lightCruiser: 3, destroyer: 6 },
    traits: [
      {
        id: 'vast_interior', name: 'Vast interior', kind: 'strength',
        description: 'Infrastructure is built 40% faster.',
        modifiers: { constructionSpeed: { infrastructure: 0.4 } },
      },
      {
        id: 'weak_dockyards', name: 'Scattered dockyards', kind: 'weakness',
        description: 'All ships build 8% slower.',
        modifiers: { dockyardOutput: { all: -0.08 } },
      },
    ],
    ai: { transitionMonth: 36, fleetMix: { battleship: 3, heavyCruiser: 1, lightCruiser: 2, destroyer: 4 } },
    shipNames: ['Gangut', 'Petropavlovsk', 'Sevastopol', 'Poltava', 'Imperatritsa Mariya', 'Borodino', 'Izmail', 'Rurik', 'Aurora', 'Bayan', 'Kirov', 'Maxim Gorky', 'Krasny Kavkaz', 'Novik', 'Gnevny', 'Storozhevoy', 'Leningrad', 'Tashkent', 'Varyag', 'Askold'],
  },
  {
    id: 'austria',
    name: 'Austria-Hungary',
    adjective: 'Austro-Hungarian',
    blurb: 'A compact Adriatic fleet with fine guns and a tight budget.',
    civilianFactories: 12,
    dockyards: 6,
    buildingSlots: 38,
    resources: { steel: 60, chromium: 3 },
    startingFleet: { battleship: 2, heavyCruiser: 1, lightCruiser: 2, destroyer: 5 },
    traits: [
      {
        id: 'skoda_guns', name: 'Škoda guns', kind: 'strength',
        description: 'Ships have 6% more heavy attack.',
        modifiers: { shipStats: { heavyAttack: 0.06 } },
      },
      {
        id: 'compact_fleet', name: 'Compact fleet', kind: 'strength',
        description: 'One sea to cover: all ships build 4% faster.',
        modifiers: { dockyardOutput: { all: 0.04 } },
      },
      {
        id: 'dual_monarchy', name: 'Dual monarchy budget', kind: 'weakness',
        description: 'Consumer goods take 4 points more of the civilian factories.',
        modifiers: { consumerGoods: 0.04 },
      },
    ],
    ai: { transitionMonth: 12, fleetMix: { battleship: 3, heavyCruiser: 1, lightCruiser: 2, destroyer: 3 } },
    shipNames: ['Viribus Unitis', 'Tegetthoff', 'Prinz Eugen', 'Szent Istvan', 'Radetzky', 'Zrinyi', 'Erzherzog Karl', 'Sankt Georg', 'Kaiser Karl VI', 'Helgoland', 'Saida', 'Novara', 'Admiral Spaun', 'Tatra', 'Balaton', 'Csepel', 'Lika', 'Triglav', 'Orjen', 'Huszar'],
  },
];

export const NATION_BY_ID: ReadonlyMap<string, NationDef> = new Map(NATIONS.map((n) => [n.id, n]));
