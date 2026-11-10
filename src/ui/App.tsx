import { defaultBattleSetup } from '../sim/scenario';
import { BattleView } from './BattleView';

export function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>Naval Strategy Game</h1>
        <span className="subtitle">Battle sandbox</span>
      </header>
      <main>
        <BattleView setup={defaultBattleSetup()} />
      </main>
    </div>
  );
}
