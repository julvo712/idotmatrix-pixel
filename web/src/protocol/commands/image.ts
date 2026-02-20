import { createImagePackets } from '../chunking.ts';

export function enableDIYMode(): Uint8Array {
  return new Uint8Array([5, 0, 4, 1, 1]);
}

export function disableDIYMode(): Uint8Array {
  return new Uint8Array([5, 0, 4, 1, 0]);
}

export function imagePackets(rgbData: Uint8Array): Uint8Array[][] {
  return createImagePackets(rgbData);
}
