import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PRESET_DESIGNS, RETIRED_PRESETS } from '../data/designs';
import { DEFAULT_FLEETS, SHIP_NAMES } from '../data/scenarios';
import { STARTING_FLEETS } from '../data/startingFleets';
import { buildBattleSetup, DEFAULT_CATALOG, type Design, type FleetSetup } from '../sim/designer';
import { createGame, DEFAULT_CONTEXT, migrateGame, nationName } from '../sim/economy';
import { createRng } from '../sim/rng';
import { BattleView } from './BattleView';
import { CampaignStart, type CampaignStartChoice } from './CampaignStart';
import { CampaignView, type Campaign } from './CampaignView';
import { DesignerView } from './DesignerView';
import { FleetEditor } from './FleetEditor';
import { MainMenu } from './MainMenu';
import { load, save } from './storage';

type Mode = 'menu' | 'campaignStart' | 'campaign' | 'sandbox';
type SandboxTab = 'battle' | 'designer';
type CampaignTab = 'campaign' | 'designer';

/** Point fleets saved before the preset line-up changed at the replacement designs. */
function upgradeFleets(fleets: [FleetSetup, FleetSetup]): [FleetSetup, FleetSetup] {
  const fix = (f: FleetSetup): FleetSetup => ({
    ...f,
    ships: f.ships.map((e) => ({ ...e, designId: RETIRED_PRESETS[e.designId] ?? e.designId })),
  });
  return [fix(fleets[0]), fix(fleets[1])];
}

function loadCampaign(): Campaign | null {
  const c = load<Campaign | null>('campaign', null);
  return c ? { ...c, game: migrateGame(c.game) } : null;
}

export function App() {
  const [mode, setMode] = useState<Mode>(() => load<Mode>('mode', 'menu'));
  const [sandboxTab, setSandboxTab] = useState<SandboxTab>(() => load('sandboxTab', 'battle'));
  const [campaignTab, setCampaignTab] = useState<CampaignTab>(() => load('campaignTab', 'campaign'));
  const [userDesigns, setUserDesigns] = useState<Design[]>(() => load<Design[]>('designs', []));
  const [fleets, setFleets] = useState<[FleetSetup, FleetSetup]>(() => upgradeFleets(load('fleets', DEFAULT_FLEETS)));
  const [campaign, setCampaignState] = useState<Campaign | null>(loadCampaign);

  useEffect(() => save('mode', mode === 'campaignStart' ? 'menu' : mode), [mode]);
  useEffect(() => save('sandboxTab', sandboxTab), [sandboxTab]);
  useEffect(() => save('campaignTab', campaignTab), [campaignTab]);
  useEffect(() => save('designs', userDesigns), [userDesigns]);
  useEffect(() => save('fleets', fleets), [fleets]);

  // The campaign changes many times a second while the clock runs: save at most once a second.
  const pending = useRef<Campaign | null>(null);
  useEffect(() => {
    pending.current = campaign;
    const t = setTimeout(() => save('campaign', pending.current), 1000);
    return () => clearTimeout(t);
  }, [campaign]);
  useEffect(() => {
    const flush = () => save('campaign', pending.current);
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  const setCampaign = useCallback((c: Campaign | ((prev: Campaign) => Campaign)) => {
    setCampaignState((prev) => (typeof c === 'function' ? (prev ? c(prev) : prev) : c));
  }, []);

  const allDesigns = useMemo(() => [...PRESET_DESIGNS, ...userDesigns], [userDesigns]);
  const built = useMemo(() => buildBattleSetup(DEFAULT_CATALOG, allDesigns, fleets, SHIP_NAMES), [allDesigns, fleets]);

  const startCampaign = ({ bookmark, playerId, rivalId }: CampaignStartChoice) => {
    const names = Object.fromEntries(bookmark.nations.map((n) => [n.nationId, { name: n.name, adjective: n.adjective }]));
    const game = createGame(DEFAULT_CONTEXT, { playerId, rivalId, startYear: bookmark.year, names, fleets: STARTING_FLEETS[bookmark.id] });
    const next = { game, rngState: createRng(bookmark.year).getState() };
    setCampaignState(next);
    save('campaign', next);
    setCampaignTab('campaign');
    setMode('campaign');
  };

  if (mode === 'menu' || (mode === 'campaign' && !campaign)) {
    return (
      <div className="app menu-app">
        <MainMenu
          saved={campaign?.game ?? null}
          onContinue={() => setMode('campaign')}
          onNewCampaign={() => {
            if (!campaign || confirm('Start a new campaign? Your current campaign will be replaced when you press Play.')) {
              setMode('campaignStart');
            }
          }}
          onSandbox={() => setMode('sandbox')}
        />
      </div>
    );
  }

  if (mode === 'campaignStart') {
    return (
      <div className="app">
        <CampaignStart onStart={startCampaign} onBack={() => setMode('menu')} />
      </div>
    );
  }

  const designer = <DesignerView userDesigns={userDesigns} setUserDesigns={setUserDesigns} allDesigns={allDesigns} />;
  const subtitle =
    mode === 'campaign' && campaign
      ? `Campaign · ${nationName(DEFAULT_CONTEXT, campaign.game, campaign.game.playerId).name}`
      : 'Battle sandbox';

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand brand-button" onClick={() => setMode('menu')} title="Main menu">
          <span className="brand-emblem" aria-hidden="true">⚓</span>
          <div>
            <h1>Naval Strategy Game</h1>
            <span className="subtitle">{subtitle}</span>
          </div>
        </button>
        <nav className="tabs">
          {mode === 'campaign' ? (
            <>
              <button className={campaignTab === 'campaign' ? 'active' : ''} onClick={() => setCampaignTab('campaign')}>
                Campaign
              </button>
              <button className={campaignTab === 'designer' ? 'active' : ''} onClick={() => setCampaignTab('designer')}>
                Ship designer
              </button>
            </>
          ) : (
            <>
              <button className={sandboxTab === 'battle' ? 'active' : ''} onClick={() => setSandboxTab('battle')}>
                Battle
              </button>
              <button className={sandboxTab === 'designer' ? 'active' : ''} onClick={() => setSandboxTab('designer')}>
                Ship designer
              </button>
            </>
          )}
          <button className="menu-link" onClick={() => setMode('menu')}>
            Main menu
          </button>
        </nav>
      </header>
      <main>
        {mode === 'campaign' && campaign ? (
          campaignTab === 'campaign' ? (
            <CampaignView campaign={campaign} setCampaign={setCampaign} designs={allDesigns} />
          ) : (
            designer
          )
        ) : sandboxTab === 'designer' ? (
          designer
        ) : (
          <>
            <FleetEditor
              fleets={fleets}
              setFleets={setFleets}
              designs={allDesigns}
              problems={built.problems}
              onReset={() => setFleets(DEFAULT_FLEETS)}
            />
            <BattleView setup={built.setup} />
          </>
        )}
      </main>
    </div>
  );
}
