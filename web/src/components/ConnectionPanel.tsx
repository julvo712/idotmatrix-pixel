import { useDevice } from '../context/DeviceContext.tsx';

export default function ConnectionPanel() {
  const { connected, connecting, deviceName, error, transportMode, connect, disconnect } = useDevice();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Connection</h2>

      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm">
          {connected ? `Connected to ${deviceName}` : 'Disconnected'}
        </span>
        {transportMode !== 'detecting' && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            transportMode === 'server'
              ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
              : 'bg-blue-900/50 text-blue-300 border border-blue-700'
          }`}>
            {transportMode === 'server' ? 'via Server' : 'via Bluetooth'}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {!connected ? (
          <button
            onClick={connect}
            disabled={connecting || transportMode === 'detecting'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded font-medium"
          >
            {connecting ? 'Connecting...' : 'Scan & Connect'}
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded font-medium"
          >
            Disconnect
          </button>
        )}
      </div>

      {transportMode === 'bluetooth' && !('bluetooth' in navigator) && (
        <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded text-sm text-yellow-200">
          Web Bluetooth is not available in this browser. Use Chrome or Edge.
        </div>
      )}
    </div>
  );
}
