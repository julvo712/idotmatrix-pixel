import { useState } from 'react';
import Sidebar from './Sidebar.tsx';
import ConnectionPanel from './ConnectionPanel.tsx';
import CommonPanel from './CommonPanel.tsx';
import ClockPanel from './ClockPanel.tsx';
import CountdownPanel from './CountdownPanel.tsx';
import ChronographPanel from './ChronographPanel.tsx';
import ScoreboardPanel from './ScoreboardPanel.tsx';
import ColorPanel from './ColorPanel.tsx';
import EffectPanel from './EffectPanel.tsx';
import EcoPanel from './EcoPanel.tsx';
import GraffitiPanel from './GraffitiPanel.tsx';
import ImagePanel from './ImagePanel.tsx';
import GifPanel from './GifPanel.tsx';
import TextPanel from './TextPanel.tsx';

const PANELS: Record<string, React.ComponentType> = {
  connection: ConnectionPanel,
  common: CommonPanel,
  clock: ClockPanel,
  text: TextPanel,
  image: ImagePanel,
  gif: GifPanel,
  graffiti: GraffitiPanel,
  color: ColorPanel,
  effect: EffectPanel,
  countdown: CountdownPanel,
  chronograph: ChronographPanel,
  scoreboard: ScoreboardPanel,
  eco: EcoPanel,
};

export default function AppShell() {
  const [activePanel, setActivePanel] = useState('connection');
  const Panel = PANELS[activePanel] ?? ConnectionPanel;

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar activePanel={activePanel} onSelect={setActivePanel} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl">
          <Panel />
        </div>
      </main>
    </div>
  );
}
