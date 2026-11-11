import { useMemo, useState } from 'react';
import { BOOKMARKS, NATURAL_RIVALS, type Bookmark, type BookmarkNation } from '../data/bookmarks';
import { HULL_CLASS_NAMES } from '../data/hulls';
import { NATION_BY_ID } from '../data/nations';
import { STARTING_FLEETS } from '../data/startingFleets';
import type { HullClass } from '../sim/designer';
import type { NationDef } from '../sim/economy';
import { Frame } from './components';
import { load, save } from './storage';

export interface CampaignStartChoice {
  bookmark: Bookmark;
  playerId: string;
  rivalId: string;
}

const portrait = (leaderId: string) => `${import.meta.env.BASE_URL}leaders/${leaderId}.jpg`;

/** HOI4-style start: pick a date on the left, then a nation by its leader. */
export function CampaignStart({ onStart, onBack }: { onStart: (c: CampaignStartChoice) => void; onBack: () => void }) {
  const [bookmarkId, setBookmarkId] = useState<string>(() => load('startBookmark', 'guns_of_august_1914'));
  const bookmark = BOOKMARKS.find((b) => b.id === bookmarkId) ?? BOOKMARKS[2]!;
  const [playerId, setPlayerId] = useState<string>(() => load('startNation', 'uk'));
  const player = bookmark.nations.find((n) => n.nationId === playerId) ?? bookmark.nations[0]!;
  const defaultRival = useMemo(
    () =>
      (NATURAL_RIVALS[player.nationId] ?? []).find((r) => bookmark.nations.some((n) => n.nationId === r)) ??
      bookmark.nations.find((n) => n.nationId !== player.nationId)!.nationId,
    [bookmark, player],
  );
  const [rivalChoice, setRivalChoice] = useState<string | null>(null);
  const rivalId =
    rivalChoice && rivalChoice !== player.nationId && bookmark.nations.some((n) => n.nationId === rivalChoice) ? rivalChoice : defaultRival;

  const pickBookmark = (id: string) => {
    setBookmarkId(id);
    save('startBookmark', id);
    setRivalChoice(null);
  };
  const pickNation = (id: string) => {
    setPlayerId(id);
    save('startNation', id);
    setRivalChoice(null);
  };

  const majors = bookmark.nations.filter((n) => n.major);
  const minors = bookmark.nations.filter((n) => !n.major);
  const def = NATION_BY_ID.get(player.nationId)!;

  return (
    <div className="start-screen">
      <aside className="bookmark-list">
        <div className="bookmark-list-title">Choose a start date</div>
        {BOOKMARKS.map((b) => (
          <button key={b.id} className={`bookmark ${b.id === bookmark.id ? 'selected' : ''}`} onClick={() => pickBookmark(b.id)}>
            <span className="bookmark-year">{b.year}</span>
            <span className="bookmark-text">
              <span className="bookmark-name">{b.title}</span>
              <span className="bookmark-tag">{b.tagline}</span>
            </span>
          </button>
        ))}
        <button className="back-button" onClick={onBack}>
          ← Main menu
        </button>
      </aside>

      <section className="bookmark-detail">
        <header className="bookmark-hero">
          <div className="bookmark-hero-year">1 January {bookmark.year}</div>
          <h2 className="bookmark-hero-title">{bookmark.title}</h2>
          <p className="bookmark-hero-desc">{bookmark.description}</p>
        </header>

        <div className="nation-row majors">
          {majors.map((n) => (
            <LeaderCard key={n.nationId} entry={n} selected={n.nationId === player.nationId} onSelect={() => pickNation(n.nationId)} />
          ))}
        </div>
        {minors.length > 0 && (
          <>
            <div className="minor-heading">Other naval powers</div>
            <div className="nation-row minors">
              {minors.map((n) => (
                <LeaderCard
                  key={n.nationId}
                  entry={n}
                  small
                  selected={n.nationId === player.nationId}
                  onSelect={() => pickNation(n.nationId)}
                />
              ))}
            </div>
          </>
        )}

        <Frame className="start-summary" title={player.name ?? def.name}>
          <div className="start-summary-grid">
            <img className="start-summary-portrait" src={portrait(player.leader.id)} alt={player.leader.name} />
            <div>
              <div className="start-leader">
                {player.leader.title} <strong>{player.leader.name}</strong>
              </div>
              <p className="start-blurb">{def.blurb}</p>
              <NationFacts def={def} />
              <FleetSummary bookmarkId={bookmark.id} nationId={player.nationId} />
              <TraitList def={def} />
            </div>
            <div className="start-actions">
              <label>
                <span>Rival</span>
                <select value={rivalId} onChange={(e) => setRivalChoice(e.target.value)}>
                  {bookmark.nations
                    .filter((n) => n.nationId !== player.nationId)
                    .map((n) => (
                      <option key={n.nationId} value={n.nationId}>
                        {n.name ?? NATION_BY_ID.get(n.nationId)!.name}
                      </option>
                    ))}
                </select>
              </label>
              <button className="primary play-button" onClick={() => onStart({ bookmark, playerId: player.nationId, rivalId })}>
                Play
              </button>
            </div>
          </div>
        </Frame>
      </section>
    </div>
  );
}

function LeaderCard({
  entry,
  selected,
  onSelect,
  small,
}: {
  entry: BookmarkNation;
  selected: boolean;
  onSelect: () => void;
  small?: boolean;
}) {
  const def = NATION_BY_ID.get(entry.nationId)!;
  return (
    <button className={`leader-card ${small ? 'small' : ''} ${selected ? 'selected' : ''}`} onClick={onSelect} title={def.blurb}>
      <span className="leader-frame">
        <img src={portrait(entry.leader.id)} alt={entry.leader.name} loading="lazy" />
      </span>
      <span className="leader-nation">{entry.name ?? def.name}</span>
      <span className="leader-name">{entry.leader.name}</span>
    </button>
  );
}

const FLEET_ORDER: HullClass[] = ['battleship', 'battlecruiser', 'carrier', 'heavyCruiser', 'lightCruiser', 'destroyer', 'submarine'];

/** "15 battleships · 3 carriers · ..." for the nation's historical starting fleet. */
function FleetSummary({ bookmarkId, nationId }: { bookmarkId: string; nationId: string }) {
  const fleet = STARTING_FLEETS[bookmarkId]?.[nationId];
  if (!fleet) return null;
  const parts = FLEET_ORDER.map((c) => {
    const n = Object.values(fleet[c] ?? {}).reduce((a, b) => a + (b ?? 0), 0);
    if (n === 0) return null;
    return `${n} ${HULL_CLASS_NAMES[c].toLowerCase()}${n === 1 ? '' : 's'}`;
  }).filter(Boolean);
  return <div className="fleet-summary-line">Fleet: {parts.join(' · ')}</div>;
}

function NationFacts({ def }: { def: NationDef }) {
  return (
    <div className="nation-facts">
      <span>
        <strong>{def.civilianFactories}</strong> factories
      </span>
      <span>
        <strong>{def.dockyards}</strong> dockyards
      </span>
      <span>
        <strong>{def.buildingSlots}</strong> building slots
      </span>
      <span>
        <strong>{def.resources.steel}</strong> steel
      </span>
    </div>
  );
}

export function TraitList({ def }: { def: NationDef }) {
  return (
    <span className="trait-list">
      {def.traits.map((t) => (
        <span key={t.id} className={`trait ${t.kind} ${t.inactive ? 'inactive' : ''}`} title={t.inactive ?? undefined}>
          <strong>{t.name}:</strong> {t.description}
        </span>
      ))}
    </span>
  );
}
