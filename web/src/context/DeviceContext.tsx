import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { WebBluetoothTransport, type ITransport } from '../protocol/transport.ts';
import { HttpTransport } from '../protocol/http-transport.ts';

export type TransportMode = 'bluetooth' | 'server' | 'detecting';

interface DeviceState {
  connected: boolean;
  connecting: boolean;
  deviceName: string | null;
  error: string | null;
  transport: ITransport;
  transportMode: TransportMode;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
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
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    try {
      await transportRef.current.connect();
      setConnected(true);
      setDeviceName(transportRef.current.deviceName());
      transportRef.current.onDisconnect(() => {
        setConnected(false);
        setDeviceName(null);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await transportRef.current.disconnect();
    setConnected(false);
    setDeviceName(null);
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
      deviceName,
      error,
      transport: transportRef.current,
      transportMode,
      connect,
      disconnect,
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
