import { useEffect, useMemo, useState } from 'react';
import { PRESET_DESIGNS } from '../data/designs';
import { DEFAULT_FLEETS, SHIP_NAMES } from '../data/scenarios';
import { buildBattleSetup, DEFAULT_CATALOG, type Design, type FleetSetup } from '../sim/designer';
import { BattleView } from './BattleView';
import { CampaignView } from './CampaignView';
import { DesignerView } from './DesignerView';
import { FleetEditor } from './FleetEditor';
import { load, save } from './storage';

type Tab = 'designer' | 'campaign' | 'sandbox';

export function App() {
  const [tab, setTab] = useState<Tab>(() => load<Tab>('tab', 'designer'));
  const [userDesigns, setUserDesigns] = useState<Design[]>(() => load<Design[]>('designs', []));
  const [fleets, setFleets] = useState<[FleetSetup, FleetSetup]>(() => load('fleets', DEFAULT_FLEETS));

  useEffect(() => save('tab', tab), [tab]);
  useEffect(() => save('designs', userDesigns), [userDesigns]);
  useEffect(() => save('fleets', fleets), [fleets]);

  const allDesigns = useMemo(() => [...PRESET_DESIGNS, ...userDesigns], [userDesigns]);
  const built = useMemo(
    () => buildBattleSetup(DEFAULT_CATALOG, allDesigns, fleets, SHIP_NAMES),
    [allDesigns, fleets],
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-emblem" aria-hidden="true">⚓</span>
          <div>
            <h1>Naval Strategy Game</h1>
            <span className="subtitle">Admiralty · 1890–1945</span>
          </div>
        </div>
        <nav className="tabs">
          <button className={tab === 'designer' ? 'active' : ''} onClick={() => setTab('designer')}>
            Ship designer
          </button>
          <button className={tab === 'campaign' ? 'active' : ''} onClick={() => setTab('campaign')}>
            Campaign
          </button>
          <button className={tab === 'sandbox' ? 'active' : ''} onClick={() => setTab('sandbox')}>
            Battle sandbox
          </button>
        </nav>
      </header>
      <main>
        {tab === 'designer' ? (
          <DesignerView userDesigns={userDesigns} setUserDesigns={setUserDesigns} allDesigns={allDesigns} />
        ) : tab === 'campaign' ? (
          <CampaignView designs={allDesigns} />
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
