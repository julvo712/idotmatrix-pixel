import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { WebBluetoothTransport, type ITransport } from '../protocol/transport.ts';
import { HttpTransport } from '../protocol/http-transport.ts';

export type TransportMode = 'bluetooth' | 'server' | 'detecting';

interface DeviceState {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  autoConnect: boolean;
  deviceName: string | null;
  error: string | null;
  transport: ITransport;
  transportMode: TransportMode;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setAutoConnect: (enabled: boolean) => Promise<void>;
  send: (data: Uint8Array, withResponse?: boolean) => Promise<void>;
  sendPackets: (packets: Uint8Array[][], withResponse?: boolean) => Promise<void>;
}

const DeviceContext = createContext<DeviceState | null>(null);

async function detectServer(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  const transportRef = useRef<ITransport>(new WebBluetoothTransport());
  const [transportMode, setTransportMode] = useState<TransportMode>('detecting');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [autoConnect, setAutoConnectState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync React state from transport every second — single source of truth
  useEffect(() => {
    const interval = setInterval(() => {
      const t = transportRef.current;
      setConnected(t.isConnected());
      setReconnecting(t.isReconnecting?.() ?? false);
      setDeviceName(t.deviceName());
      if ('autoConnect' in t && typeof (t as any).autoConnect === 'function') {
        setAutoConnectState((t as any).autoConnect());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    detectServer().then((serverAvailable) => {
      if (serverAvailable) {
        transportRef.current = new HttpTransport();
        setTransportMode('server');
      } else {
        transportRef.current = new WebBluetoothTransport();
        setTransportMode('bluetooth');
      }
    });
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    setReconnecting(false);
    try {
      await transportRef.current.connect();
      // Immediately sync state after connect
      setConnected(transportRef.current.isConnected());
      setDeviceName(transportRef.current.deviceName());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);

  const setAutoConnect = useCallback(async (enabled: boolean) => {
    const t = transportRef.current;
    if ('setAutoConnect' in t && typeof (t as any).setAutoConnect === 'function') {
      await (t as any).setAutoConnect(enabled);
      setAutoConnectState(enabled);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await transportRef.current.disconnect();
    setConnected(false);
    setDeviceName(null);
    setReconnecting(false);
  }, []);

  const send = useCallback(async (data: Uint8Array, withResponse = false) => {
    try {
      await transportRef.current.sendBytes(data, withResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
      throw e;
    }
  }, []);

  const sendPackets = useCallback(async (packets: Uint8Array[][], withResponse = false) => {
    try {
      await transportRef.current.sendPackets(packets, withResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
      throw e;
    }
  }, []);

  return (
    <DeviceContext.Provider value={{
      connected,
      connecting,
      reconnecting,
      autoConnect,
      deviceName,
      error,
      transport: transportRef.current,
      transportMode,
      connect,
      disconnect,
      setAutoConnect,
      send,
      sendPackets,
    }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice(): DeviceState {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
  return ctx;
}
