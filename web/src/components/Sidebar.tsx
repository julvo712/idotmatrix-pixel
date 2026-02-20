import { useDevice } from '../context/DeviceContext.tsx';

const NAV_ITEMS = [
  { id: 'connection', label: 'Connection' },
  { id: 'common', label: 'Controls' },
  { id: 'clock', label: 'Clock' },
  { id: 'text', label: 'Text' },
  { id: 'image', label: 'Image' },
  { id: 'gif', label: 'GIF' },
  { id: 'graffiti', label: 'Graffiti' },
  { id: 'color', label: 'Color' },
  { id: 'effect', label: 'Effects' },
  { id: 'countdown', label: 'Countdown' },
  { id: 'chronograph', label: 'Stopwatch' },
  { id: 'scoreboard', label: 'Scoreboard' },
  { id: 'eco', label: 'Eco Mode' },
];

interface SidebarProps {
  activePanel: string;
  onSelect: (id: string) => void;
}

export default function Sidebar({ activePanel, onSelect }: SidebarProps) {
  const { connected, deviceName } = useDevice();

  return (
    <aside className="w-48 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">iDotMatrix</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400 truncate">
            {connected ? deviceName : 'Not connected'}
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${
              activePanel === item.id ? 'bg-gray-800 text-white border-l-2 border-blue-500' : 'text-gray-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
