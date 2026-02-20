import { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { countdown } from '../protocol/commands/countdown.ts';
import { CountdownAction } from '../protocol/types.ts';

export default function CountdownPanel() {
  const { send, connected } = useDevice();
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);

  const exec = async (action: number, min = 0, sec = 0) => {
    setSending(true);
    try { await send(countdown(action, min, sec)); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Countdown</h2>

      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Minutes</label>
          <input type="number" min={0} max={59} value={minutes}
            onChange={e => setMinutes(Number(e.target.value))}
            className="w-20 bg-gray-700 rounded px-3 py-2" />
        </div>
        <span className="text-2xl pb-1">:</span>
        <div>
          <label className="block text-sm mb-1">Seconds</label>
          <input type="number" min={0} max={59} value={seconds}
            onChange={e => setSeconds(Number(e.target.value))}
            className="w-20 bg-gray-700 rounded px-3 py-2" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => exec(CountdownAction.Start, minutes, seconds)}
          disabled={!connected || sending}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 rounded">
          Start
        </button>
        <button onClick={() => exec(CountdownAction.Pause)}
          disabled={!connected || sending}
          className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 rounded">
          Pause
        </button>
        <button onClick={() => exec(CountdownAction.Restart)}
          disabled={!connected || sending}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 rounded">
          Restart
        </button>
        <button onClick={() => exec(CountdownAction.Stop)}
          disabled={!connected || sending}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 rounded">
          Stop
        </button>
      </div>
    </div>
  );
}
