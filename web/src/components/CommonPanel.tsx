import { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { turnOn, turnOff, setBrightness, setFlip, freezeScreen, setTime } from '../protocol/commands/common.ts';

export default function CommonPanel() {
  const { send, connected } = useDevice();
  const [brightness, setBrightnessVal] = useState(50);
  const [flipped, setFlipped] = useState(false);
  const [sending, setSending] = useState(false);

  const exec = async (fn: () => Uint8Array, withResponse = true) => {
    setSending(true);
    try { await send(fn(), withResponse); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Common Controls</h2>

      <div className="flex gap-2">
        <button onClick={() => exec(turnOn)} disabled={!connected || sending}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 rounded">
          Turn On
        </button>
        <button onClick={() => exec(turnOff)} disabled={!connected || sending}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 rounded">
          Turn Off
        </button>
        <button onClick={() => exec(freezeScreen)} disabled={!connected || sending}
          className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 rounded">
          Freeze
        </button>
      </div>

      <div>
        <label className="block text-sm mb-1">Brightness: {brightness}%</label>
        <input type="range" min={5} max={100} value={brightness}
          onChange={e => setBrightnessVal(Number(e.target.value))}
          onMouseUp={() => { if (connected) exec(() => setBrightness(brightness)); }}
          onTouchEnd={() => { if (connected) exec(() => setBrightness(brightness)); }}
          className="w-full" />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm">Flip 180°</label>
        <button
          onClick={() => {
            const next = !flipped;
            setFlipped(next);
            exec(() => setFlip(next));
          }}
          disabled={!connected || sending}
          className={`px-3 py-1 rounded ${flipped ? 'bg-blue-600' : 'bg-gray-600'} hover:opacity-80 disabled:bg-gray-700`}
        >
          {flipped ? 'On' : 'Off'}
        </button>
      </div>

      <button
        onClick={() => exec(() => setTime(new Date()))}
        disabled={!connected || sending}
        className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 rounded"
      >
        Sync Time
      </button>
    </div>
  );
}
