import { useDevice } from '../context/DeviceContext.tsx';

export default function ConnectionPanel() {
  const {
    connected, connecting, reconnecting, autoConnect, deviceName,
    error, transportMode, connect, disconnect, setAutoConnect,
  } = useDevice();

  const statusColor = connected ? 'bg-green-500' : reconnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500';
  const statusText = connected
    ? `Connected to ${deviceName}`
    : reconnecting
      ? 'Reconnecting...'
      : 'Disconnected';

  const isServer = transportMode === 'server';

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Connection</h2>

      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${statusColor}`} />
        <span className="text-sm">{statusText}</span>
        {transportMode !== 'detecting' && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isServer
              ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
              : 'bg-blue-900/50 text-blue-300 border border-blue-700'
          }`}>
            {isServer ? 'via Server' : 'via Bluetooth'}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-200">
          {error}
        </div>
      )}

      {isServer && (
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={autoConnect}
              onChange={(e) => setAutoConnect(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-600 rounded-full peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm">Auto-connect</span>
        </label>
      )}

      {/* Show manual connect/disconnect only when auto-connect is off or in bluetooth mode */}
      {(!isServer || !autoConnect) && (
        <div className="flex gap-2">
          {!connected && !reconnecting ? (
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
      )}

      {/* Always show disconnect when auto-connect is on but connected */}
      {isServer && autoConnect && connected && (
        <div className="flex gap-2">
          <button
            onClick={disconnect}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded font-medium text-sm"
          >
            Disconnect
          </button>
        </div>
      )}

      {transportMode === 'bluetooth' && !('bluetooth' in navigator) && (
        <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded text-sm text-yellow-200">
          Web Bluetooth is not available in this browser. Use Chrome or Edge.
        </div>
      )}
    </div>
  );
}
