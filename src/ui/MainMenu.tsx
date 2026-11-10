import { useState } from 'react';
import credits from '../data/leaderCredits.json';
import { MONTH_NAMES } from '../data/economy';
import { DEFAULT_CONTEXT, nationName, type GameState } from '../sim/economy';
import { ShipSilhouette } from './art/ShipSilhouette';

interface Props {
  saved: GameState | null;
  onContinue: () => void;
  onNewCampaign: () => void;
  onSandbox: () => void;
}

/** Title screen: campaign, sandbox, credits. */
export function MainMenu({ saved, onContinue, onNewCampaign, onSandbox }: Props) {
  const [showCredits, setShowCredits] = useState(false);
  const savedName = saved ? nationName(DEFAULT_CONTEXT, saved, saved.playerId).name : null;
  return (
    <div className="main-menu">
      <div className="menu-backdrop" aria-hidden="true">
        <ShipSilhouette kind="battleship" className="menu-ship ship-a" />
        <ShipSilhouette kind="destroyer" className="menu-ship ship-b" />
        <ShipSilhouette kind="carrier" className="menu-ship ship-c" />
      </div>
      <div className="menu-panel">
        <div className="menu-emblem" aria-hidden="true">⚓</div>
        <h1 className="menu-title">Naval Strategy Game</h1>
        <div className="menu-subtitle">Admiralty · 1890 onwards</div>
        <div className="menu-buttons">
          {saved && (
            <button className="primary menu-button" onClick={onContinue}>
              Continue campaign
              <span className="menu-button-sub">
                {savedName} · {saved.date.day ?? 1} {MONTH_NAMES[saved.date.month - 1]} {saved.date.year}
              </span>
            </button>
          )}
          <button className={`menu-button ${saved ? '' : 'primary'}`} onClick={onNewCampaign}>
            New campaign
            <span className="menu-button-sub">Run a navy from a historical start date, with a ship designer</span>
          </button>
          <button className="menu-button" onClick={onSandbox}>
            Battle sandbox
            <span className="menu-button-sub">Design ships and pit any two fleets against each other</span>
          </button>
          <button className="menu-button small" onClick={() => setShowCredits(true)}>
            Credits
          </button>
        </div>
      </div>
      {showCredits && <Credits onClose={() => setShowCredits(false)} />}
    </div>
  );
}

function Credits({ onClose }: { onClose: () => void }) {
  const table = credits as Record<string, { file: string; source: string; license: string; licenseUrl: string | null; author: string }>;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal frame credits" role="dialog" aria-label="Credits" onClick={(e) => e.stopPropagation()}>
        <header className="frame-title">
          <span>Credits</span>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="frame-body">
          <p className="small">
            Leader portraits are historical photographs from Wikimedia Commons. Most are in the public domain; those under
            Creative Commons licences are credited below and used under those licences (cropped and resized).
          </p>
          <ul className="credit-list">
            {Object.entries(table)
              .sort((a, b) => Number(a[1].license === 'Public domain') - Number(b[1].license === 'Public domain'))
              .map(([id, c]) => (
                <li key={id}>
                  <a href={c.source} target="_blank" rel="noreferrer">
                    {c.file}
                  </a>{' '}
                  <span className="muted">
                    · {c.author} ·{' '}
                    {c.licenseUrl ? (
                      <a href={c.licenseUrl} target="_blank" rel="noreferrer">
                        {c.license}
                      </a>
                    ) : (
                      c.license
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
