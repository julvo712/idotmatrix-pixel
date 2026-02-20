import { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { scoreboard } from '../protocol/commands/scoreboard.ts';

export default function ScoreboardPanel() {
  const { send, connected } = useDevice();
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  const [sending, setSending] = useState(false);

  const apply = async (c1: number, c2: number) => {
    setSending(true);
    try { await send(scoreboard(c1, c2)); }
    finally { setSending(false); }
  };

  const adjust = (which: 1 | 2, delta: number) => {
    if (which === 1) {
      const next = Math.max(0, Math.min(999, count1 + delta));
      setCount1(next);
      apply(next, count2);
    } else {
      const next = Math.max(0, Math.min(999, count2 + delta));
      setCount2(next);
      apply(count1, next);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Scoreboard</h2>

      <div className="flex gap-8">
        {([1, 2] as const).map(which => {
          const val = which === 1 ? count1 : count2;
          const setVal = which === 1 ? setCount1 : setCount2;
          return (
            <div key={which} className="text-center">
              <div className="text-sm mb-2 text-gray-400">Player {which}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => adjust(which, -1)} disabled={!connected || sending}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded text-lg">
                  -
                </button>
                <input type="number" min={0} max={999} value={val}
                  onChange={e => {
                    const v = Math.max(0, Math.min(999, Number(e.target.value)));
                    setVal(v);
                  }}
                  onBlur={() => apply(count1, count2)}
                  className="w-20 bg-gray-700 rounded px-3 py-2 text-center text-2xl" />
                <button onClick={() => adjust(which, 1)} disabled={!connected || sending}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded text-lg">
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
