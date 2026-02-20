import { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { ecoMode } from '../protocol/commands/eco.ts';

export default function EcoPanel() {
  const { send, connected } = useDevice();
  const [enabled, setEnabled] = useState(false);
  const [startHour, setStartHour] = useState(22);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(6);
  const [endMinute, setEndMinute] = useState(0);
  const [brightness, setBrightness] = useState(10);
  const [sending, setSending] = useState(false);

  const apply = async () => {
    setSending(true);
    try {
      await send(ecoMode(enabled, startHour, startMinute, endHour, endMinute, brightness));
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Eco Mode</h2>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
        Enable Eco Mode
      </label>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Start Hour</label>
          <input type="number" min={0} max={23} value={startHour}
            onChange={e => setStartHour(Number(e.target.value))}
            className="w-full bg-gray-700 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Start Minute</label>
          <input type="number" min={0} max={59} value={startMinute}
            onChange={e => setStartMinute(Number(e.target.value))}
            className="w-full bg-gray-700 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">End Hour</label>
          <input type="number" min={0} max={23} value={endHour}
            onChange={e => setEndHour(Number(e.target.value))}
            className="w-full bg-gray-700 rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">End Minute</label>
          <input type="number" min={0} max={59} value={endMinute}
            onChange={e => setEndMinute(Number(e.target.value))}
            className="w-full bg-gray-700 rounded px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Eco Brightness: {brightness}</label>
        <input type="range" min={0} max={100} value={brightness}
          onChange={e => setBrightness(Number(e.target.value))}
          className="w-full" />
      </div>

      <button onClick={apply} disabled={!connected || sending}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded">
        Apply
      </button>
    </div>
  );
}
