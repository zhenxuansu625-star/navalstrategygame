/**
 * Campaign start dates ("bookmarks"), with each nation's leader and name at
 * that date. Portraits live in public/leaders/<leader id>.jpg; their sources and
 * licences are in leaderCredits.json.
 */
export interface Leader {
  /** Portrait file name (without .jpg) and key into leaderCredits.json. */
  id: string;
  name: string;
  title: string;
}

export interface BookmarkNation {
  nationId: string;
  leader: Leader;
  /** Name and adjective at this date, when they differ from the nation's usual ones. */
  name?: string;
  adjective?: string;
  /** Major powers are shown large; the rest in a smaller row. */
  major: boolean;
}

export interface Bookmark {
  id: string;
  year: number;
  title: string;
  /** One-line situation, shown under the title. */
  tagline: string;
  description: string;
  nations: BookmarkNation[];
}

const L = (id: string, name: string, title: string): Leader => ({ id, name, title });

export const BOOKMARKS: Bookmark[] = [
  {
    id: 'naval_race_1890',
    year: 1890,
    title: 'The Naval Race',
    tagline: 'Sea power is national power.',
    description:
      'Mahan publishes The Influence of Sea Power upon History and every capital reads it. Steel, steam and the big gun are remaking navies; the great powers race to build fleets worthy of empires.',
    nations: [
      { nationId: 'uk', leader: L('salisbury', 'Lord Salisbury', 'Prime Minister'), major: true },
      { nationId: 'germany', leader: L('wilhelm2', 'Wilhelm II', 'German Emperor'), major: true },
      { nationId: 'usa', leader: L('harrison', 'Benjamin Harrison', 'President'), major: true },
      { nationId: 'france', leader: L('carnot', 'Sadi Carnot', 'President'), major: true },
      { nationId: 'japan', leader: L('meiji', 'Emperor Meiji', 'Emperor'), major: true },
      { nationId: 'italy', leader: L('umberto1', 'Umberto I', 'King'), major: false },
      { nationId: 'russia', leader: L('alexander3', 'Alexander III', 'Emperor'), major: false },
      { nationId: 'austria', leader: L('franzjoseph', 'Franz Joseph I', 'Emperor'), major: false },
    ],
  },
  {
    id: 'dreadnought_1906',
    year: 1906,
    title: 'The Dreadnought Revolution',
    tagline: 'One ship makes every battleship obsolete.',
    description:
      'HMS Dreadnought is launched: all big guns, turbines, and a speed no older battleship can match. Every navy starts again from zero, and Britain\'s lead is suddenly up for grabs.',
    nations: [
      { nationId: 'uk', leader: L('campbellbannerman', 'Henry Campbell-Bannerman', 'Prime Minister'), major: true },
      { nationId: 'germany', leader: L('wilhelm2', 'Wilhelm II', 'German Emperor'), major: true },
      { nationId: 'usa', leader: L('troosevelt', 'Theodore Roosevelt', 'President'), major: true },
      { nationId: 'france', leader: L('fallieres', 'Armand Fallières', 'President'), major: true },
      { nationId: 'japan', leader: L('meiji', 'Emperor Meiji', 'Emperor'), major: true },
      { nationId: 'italy', leader: L('ve3', 'Victor Emmanuel III', 'King'), major: false },
      { nationId: 'russia', leader: L('nicholas2', 'Nicholas II', 'Emperor'), major: false },
      { nationId: 'austria', leader: L('franzjoseph', 'Franz Joseph I', 'Emperor'), major: false },
    ],
  },
  {
    id: 'guns_of_august_1914',
    year: 1914,
    title: 'The Guns of August',
    tagline: 'The dreadnought fleets put to sea.',
    description:
      'A decade of naval rivalry ends in war. The Grand Fleet and the High Seas Fleet face each other across the North Sea, and the first U-boats slip out to hunt.',
    nations: [
      { nationId: 'uk', leader: L('asquith', 'H. H. Asquith', 'Prime Minister'), major: true },
      { nationId: 'germany', leader: L('wilhelm2', 'Wilhelm II', 'German Emperor'), major: true },
      { nationId: 'usa', leader: L('wilson', 'Woodrow Wilson', 'President'), major: true },
      { nationId: 'france', leader: L('poincare', 'Raymond Poincaré', 'President'), major: true },
      { nationId: 'japan', leader: L('taisho', 'Emperor Taishō', 'Emperor'), major: true },
      { nationId: 'italy', leader: L('ve3', 'Victor Emmanuel III', 'King'), major: false },
      { nationId: 'russia', leader: L('nicholas2', 'Nicholas II', 'Emperor'), major: false },
      { nationId: 'austria', leader: L('franzjoseph', 'Franz Joseph I', 'Emperor'), major: false },
    ],
  },
  {
    id: 'washington_1922',
    year: 1922,
    title: 'The Washington Treaty',
    tagline: 'Battleships capped, carriers rising.',
    description:
      'The victors agree to stop building battleships. Unfinished hulls become the first great aircraft carriers, and admirals argue over what the next war at sea will look like.',
    nations: [
      { nationId: 'uk', leader: L('lloydgeorge', 'David Lloyd George', 'Prime Minister'), major: true },
      { nationId: 'usa', leader: L('harding', 'Warren G. Harding', 'President'), major: true },
      { nationId: 'japan', leader: L('taisho', 'Emperor Taishō', 'Emperor'), major: true },
      { nationId: 'france', leader: L('millerand', 'Alexandre Millerand', 'President'), major: true },
      { nationId: 'italy', leader: L('ve3', 'Victor Emmanuel III', 'King'), major: true },
      { nationId: 'germany', leader: L('ebert', 'Friedrich Ebert', 'President'), major: false },
      { nationId: 'russia', leader: L('lenin', 'Vladimir Lenin', 'Chairman'), name: 'Soviet Union', adjective: 'Soviet', major: false },
    ],
  },
  {
    id: 'road_to_war_1936',
    year: 1936,
    title: 'The Road to War',
    tagline: 'The treaties collapse.',
    description:
      'The naval treaties lapse and the building holiday ends. Fast battleships, fleet carriers and new submarines are laid down in every major yard as the world drifts towards war.',
    nations: [
      { nationId: 'uk', leader: L('baldwin', 'Stanley Baldwin', 'Prime Minister'), major: true },
      { nationId: 'germany', leader: L('hitler', 'Adolf Hitler', 'Führer'), major: true },
      { nationId: 'usa', leader: L('fdr', 'Franklin D. Roosevelt', 'President'), major: true },
      { nationId: 'japan', leader: L('hirohito', 'Hirohito', 'Emperor'), major: true },
      { nationId: 'italy', leader: L('mussolini', 'Benito Mussolini', 'Prime Minister'), major: true },
      { nationId: 'france', leader: L('lebrun', 'Albert Lebrun', 'President'), major: false },
      { nationId: 'russia', leader: L('stalin', 'Joseph Stalin', 'General Secretary'), name: 'Soviet Union', adjective: 'Soviet', major: false },
    ],
  },
  {
    id: 'gathering_storm_1939',
    year: 1939,
    title: 'The Gathering Storm',
    tagline: 'War returns to the oceans.',
    description:
      'Europe is at war again. The Atlantic fills with U-boats, the Royal Navy stretches across the globe, and in the Pacific two carrier navies prepare for a war of air power.',
    nations: [
      { nationId: 'uk', leader: L('chamberlain', 'Neville Chamberlain', 'Prime Minister'), major: true },
      { nationId: 'germany', leader: L('hitler', 'Adolf Hitler', 'Führer'), major: true },
      { nationId: 'usa', leader: L('fdr', 'Franklin D. Roosevelt', 'President'), major: true },
      { nationId: 'japan', leader: L('hirohito', 'Hirohito', 'Emperor'), major: true },
      { nationId: 'italy', leader: L('mussolini', 'Benito Mussolini', 'Prime Minister'), major: true },
      { nationId: 'france', leader: L('lebrun', 'Albert Lebrun', 'President'), major: false },
      { nationId: 'russia', leader: L('stalin', 'Joseph Stalin', 'General Secretary'), name: 'Soviet Union', adjective: 'Soviet', major: false },
    ],
  },
];

/** Sensible default rival for each nation, if it is in the bookmark. */
export const NATURAL_RIVALS: Record<string, string[]> = {
  uk: ['germany', 'france', 'usa'],
  germany: ['uk', 'france', 'russia'],
  usa: ['japan', 'uk'],
  france: ['germany', 'italy', 'uk'],
  japan: ['usa', 'russia', 'uk'],
  italy: ['france', 'austria', 'uk'],
  russia: ['japan', 'germany', 'uk'],
  austria: ['italy', 'russia'],
};
