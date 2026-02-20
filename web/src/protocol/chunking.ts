import CRC32 from 'crc-32';
import { CHUNK_SIZE_4K, MTU_SIZE, IMAGE_HEADER_SIZE, GIF_HEADER_SIZE } from './types.ts';

export function int16LE(value: number): Uint8Array {
  const buf = new Uint8Array(2);
  buf[0] = value & 0xff;
  buf[1] = (value >> 8) & 0xff;
  return buf;
}

export function int32LE(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  buf[0] = value & 0xff;
  buf[1] = (value >> 8) & 0xff;
  buf[2] = (value >> 16) & 0xff;
  buf[3] = (value >> 24) & 0xff;
  return buf;
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

export function splitBySize(data: Uint8Array, chunkSize: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

function splitByMTU(data: Uint8Array): Uint8Array[] {
  return splitBySize(data, MTU_SIZE);
}

export function crc32(data: Uint8Array): number {
  return CRC32.buf(data) >>> 0; // unsigned
}

/**
 * Create image packets for DIY image upload.
 * Each 4K chunk gets a 9-byte header, then is split by MTU.
 */
export function createImagePackets(imageData: Uint8Array): Uint8Array[][] {
  const totalLenBytes = int32LE(imageData.length);
  const chunks = splitBySize(imageData, CHUNK_SIZE_4K);
  const packets: Uint8Array[][] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const packetLen = chunk.length + IMAGE_HEADER_SIZE;
    const header = new Uint8Array(IMAGE_HEADER_SIZE);
    const lenBytes = int16LE(packetLen);
    header[0] = lenBytes[0];
    header[1] = lenBytes[1];
    header[2] = 0; // command: image
    header[3] = 0;
    header[4] = i > 0 ? 2 : 0; // continuation flag
    header[5] = totalLenBytes[0];
    header[6] = totalLenBytes[1];
    header[7] = totalLenBytes[2];
    header[8] = totalLenBytes[3];

    const largePacket = concatBytes(header, chunk);
    packets.push(splitByMTU(largePacket));
  }

  return packets;
}

/**
 * Create GIF packets for upload.
 * Each 4K chunk gets a 16-byte header with CRC32, then is split by MTU.
 */
export function createGifPackets(gifData: Uint8Array, gifType = 12, _timeSign = 1): Uint8Array[][] {
  const totalLenBytes = int32LE(gifData.length);
  const crcValue = crc32(gifData);
  const crcBytes = int32LE(crcValue);
  const chunks = splitBySize(gifData, CHUNK_SIZE_4K);
  const packets: Uint8Array[][] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const packetLen = chunk.length + GIF_HEADER_SIZE;
    const header = new Uint8Array(GIF_HEADER_SIZE);
    const lenBytes = int16LE(packetLen);

    header[0] = lenBytes[0];
    header[1] = lenBytes[1];
    header[2] = 1; // command: gif
    header[3] = 0;
    header[4] = i > 0 ? 2 : 0; // continuation flag
    // total length LE
    header[5] = totalLenBytes[0];
    header[6] = totalLenBytes[1];
    header[7] = totalLenBytes[2];
    header[8] = totalLenBytes[3];
    // CRC32 LE
    header[9] = crcBytes[0];
    header[10] = crcBytes[1];
    header[11] = crcBytes[2];
    header[12] = crcBytes[3];
    // time signature (0 for type 12)
    header[13] = 0;
    header[14] = 0;
    header[15] = gifType & 0xff;

    const largePacket = concatBytes(header, chunk);
    packets.push(splitByMTU(largePacket));
  }

  return packets;
}
