import { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { chronograph } from '../protocol/commands/chronograph.ts';
import { ChronographAction } from '../protocol/types.ts';

export default function ChronographPanel() {
  const { send, connected } = useDevice();
  const [sending, setSending] = useState(false);

  const exec = async (action: number) => {
    setSending(true);
    try { await send(chronograph(action)); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Stopwatch</h2>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => exec(ChronographAction.Start)}
          disabled={!connected || sending}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 rounded">
          Start
        </button>
        <button onClick={() => exec(ChronographAction.Pause)}
          disabled={!connected || sending}
          className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 rounded">
          Pause
        </button>
        <button onClick={() => exec(ChronographAction.Resume)}
          disabled={!connected || sending}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 rounded">
          Resume
        </button>
        <button onClick={() => exec(ChronographAction.Reset)}
          disabled={!connected || sending}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 rounded">
          Reset
        </button>
      </div>
    </div>
  );
}
