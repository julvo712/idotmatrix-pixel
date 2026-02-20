import { createGifPackets } from '../chunking.ts';

export function gifPackets(gifData: Uint8Array): Uint8Array[][] {
  return createGifPackets(gifData, 12, 1);
}
