import { DEFAULT_SCENARIO } from '../data/scenarios';
import { BattleView } from './BattleView';

export function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>Naval Strategy Game</h1>
        <span className="subtitle">Battle sandbox</span>
      </header>
      <main>
        <BattleView setup={DEFAULT_SCENARIO} />
      </main>
    </div>
  );
}
