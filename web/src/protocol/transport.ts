import {
  BLE_SERVICE_UUID,
  BLE_WRITE_CHARACTERISTIC,
  BLE_DEVICE_NAME_PREFIX,
  MTU_SIZE,
} from './types.ts';

export interface ITransport {
  scan(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  deviceName(): string | null;
  sendBytes(data: Uint8Array, withResponse?: boolean): Promise<void>;
  sendPackets(packets: Uint8Array[][], withResponse?: boolean): Promise<void>;
  onDisconnect(cb: () => void): void;
}

export class WebBluetoothTransport implements ITransport {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private disconnectCb: (() => void) | null = null;

  scan(): Promise<void> {
    // scan is combined with connect in Web Bluetooth
    return this.connect();
  }

  async connect(): Promise<void> {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: BLE_DEVICE_NAME_PREFIX }],
      optionalServices: [BLE_SERVICE_UUID],
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      this.server = null;
      this.writeChar = null;
      this.disconnectCb?.();
    });

    this.server = await this.device.gatt!.connect();
    const service = await this.server.getPrimaryService(BLE_SERVICE_UUID);
    this.writeChar = await service.getCharacteristic(BLE_WRITE_CHARACTERISTIC);
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.server = null;
    this.writeChar = null;
  }

  isConnected(): boolean {
    return this.device?.gatt?.connected ?? false;
  }

  deviceName(): string | null {
    return this.device?.name ?? null;
  }

  async sendBytes(data: Uint8Array, withResponse = false): Promise<void> {
    if (!this.writeChar) throw new Error('Not connected');

    // Split by MTU
    for (let offset = 0; offset < data.length; offset += MTU_SIZE) {
      const chunk = data.slice(offset, offset + MTU_SIZE);
      const buf = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
      const view = new DataView(buf);
      if (withResponse) {
        await this.writeChar.writeValueWithResponse(view);
      } else {
        await this.writeChar.writeValueWithoutResponse(view);
      }
    }
  }

  async sendPackets(packets: Uint8Array[][], withResponse = false): Promise<void> {
    if (!this.writeChar) throw new Error('Not connected');

    for (const packet of packets) {
      for (let j = 0; j < packet.length; j++) {
        const isLast = j === packet.length - 1;
        const useResponse = withResponse && isLast;
        const buf = packet[j].buffer.slice(packet[j].byteOffset, packet[j].byteOffset + packet[j].byteLength) as ArrayBuffer;
        const view = new DataView(buf);
        if (useResponse) {
          await this.writeChar!.writeValueWithResponse(view);
        } else {
          await this.writeChar!.writeValueWithoutResponse(view);
        }
      }
    }
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCb = cb;
  }
}
