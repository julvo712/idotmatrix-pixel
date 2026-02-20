import { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { showClock } from '../protocol/commands/clock.ts';
import { ClockStyle, CLOCK_STYLE_LABELS, type RGB } from '../protocol/types.ts';
import { hexToRgb } from '../lib/color-utils.ts';

export default function ClockPanel() {
  const { send, connected } = useDevice();
  const [style, setStyle] = useState(ClockStyle.RGBSwipeOutline as number);
  const [showDate, setShowDate] = useState(true);
  const [hour24, setHour24] = useState(true);
  const [color, setColor] = useState('#ffffff');
  const [sending, setSending] = useState(false);

  const apply = async () => {
    setSending(true);
    try {
      const rgb: RGB = hexToRgb(color);
      await send(showClock(style, showDate, hour24, rgb));
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Clock</h2>

      <div>
        <label className="block text-sm mb-1">Style</label>
        <select value={style} onChange={e => setStyle(Number(e.target.value))}
          className="w-full bg-gray-700 rounded px-3 py-2">
          {Object.entries(CLOCK_STYLE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showDate} onChange={e => setShowDate(e.target.checked)} />
          Show Date
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hour24} onChange={e => setHour24(e.target.checked)} />
          24h Format
        </label>
      </div>

      <div>
        <label className="block text-sm mb-1">Color</label>
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          className="w-12 h-8 bg-transparent cursor-pointer" />
      </div>

      <button onClick={apply} disabled={!connected || sending}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded">
        Apply
      </button>
    </div>
  );
}
