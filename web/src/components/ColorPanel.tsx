import { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { fullscreenColor } from '../protocol/commands/fullscreen-color.ts';
import { hexToRgb } from '../lib/color-utils.ts';

export default function ColorPanel() {
  const { send, connected } = useDevice();
  const [color, setColor] = useState('#ff0000');
  const [sending, setSending] = useState(false);

  const apply = async () => {
    setSending(true);
    try { await send(fullscreenColor(hexToRgb(color)), true); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Fullscreen Color</h2>

      <div className="flex items-center gap-4">
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          className="w-16 h-16 bg-transparent cursor-pointer rounded" />
        <div className="w-16 h-16 rounded border border-gray-600"
          style={{ backgroundColor: color }} />
      </div>

      <button onClick={apply} disabled={!connected || sending}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded">
        Apply
      </button>
    </div>
  );
}
