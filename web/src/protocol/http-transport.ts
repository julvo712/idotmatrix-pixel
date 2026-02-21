import type { ITransport } from './transport.ts';

function uint8ToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

export class HttpTransport implements ITransport {
  private _connected = false;
  private _reconnecting = false;
  private _deviceName: string | null = null;
  private _disconnectCb: (() => void) | null = null;
  private _reconnectCb: (() => void) | null = null;
  private _pollTimer: ReturnType<typeof setInterval> | null = null;
  private _macAddress: string | null = null;
  private _screenSize: number | null = null;

  async scan(): Promise<void> {
    const res = await fetch('/api/device/scan', { method: 'POST' });
    if (!res.ok) throw new Error('Scan failed');
    const data = await res.json();
    if (data.devices.length > 0) {
      this._macAddress = data.devices[0];
    }
  }

  async connect(): Promise<void> {
    if (!this._macAddress) {
      await this.scan();
    }

    const res = await fetch('/api/device/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        macAddress: this._macAddress,
        screenSize: this._screenSize,
      }),
    });
    if (!res.ok) throw new Error('Connect failed');
    const status = await res.json();
    this._connected = status.connected;
    this._reconnecting = false;
    this._deviceName = status.macAddress ? `IDM (${status.macAddress})` : 'IDM (server)';
    this._startPolling();
  }

  async disconnect(): Promise<void> {
    this._stopPolling();
    await fetch('/api/device/disconnect', { method: 'POST' });
    this._connected = false;
    this._reconnecting = false;
    this._deviceName = null;
  }

  isConnected(): boolean {
    return this._connected;
  }

  isReconnecting(): boolean {
    return this._reconnecting;
  }

  deviceName(): string | null {
    return this._deviceName;
  }

  async sendBytes(data: Uint8Array, withResponse = false): Promise<void> {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: uint8ToBase64(data),
        withResponse,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Send failed: ${text}`);
    }
  }

  async sendPackets(packets: Uint8Array[][], withResponse = false): Promise<void> {
    const encoded = packets.map(packet =>
      packet.map(chunk => uint8ToBase64(chunk))
    );
    const res = await fetch('/api/send-packets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packets: encoded,
        withResponse,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Send packets failed: ${text}`);
    }
  }

  onDisconnect(cb: () => void): void {
    this._disconnectCb = cb;
  }

  onReconnect(cb: () => void): void {
    this._reconnectCb = cb;
  }

  private _startPolling(): void {
    this._stopPolling();
    this._pollTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/device/status');
        if (!res.ok) return;
        const status = await res.json();

        if (status.connected && !this._connected) {
          // Reconnected!
          this._connected = true;
          this._reconnecting = false;
          this._reconnectCb?.();
        } else if (!status.connected && status.reconnecting) {
          // Server is trying to reconnect — keep polling, show reconnecting
          this._connected = false;
          this._reconnecting = true;
          // Don't fire disconnect callback — server is handling it
        } else if (!status.connected && !status.reconnecting && this._connected) {
          // Truly disconnected, server gave up
          this._connected = false;
          this._reconnecting = false;
          this._deviceName = null;
          this._disconnectCb?.();
          this._stopPolling();
        }
      } catch {
        // Server unreachable
        if (this._connected || this._reconnecting) {
          this._connected = false;
          this._reconnecting = false;
          this._deviceName = null;
          this._disconnectCb?.();
          this._stopPolling();
        }
      }
    }, 3000);
  }

  private _stopPolling(): void {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }
}
