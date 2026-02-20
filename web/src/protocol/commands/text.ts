import type { RGB } from '../types.ts';
import { crc32, int16LE, int32LE, concatBytes } from '../chunking.ts';

const CHAR_WIDTH = 16;
const CHAR_HEIGHT = 32;
const SEPARATOR = new Uint8Array([0x05, 0xff, 0xff, 0xff]);

/**
 * Render a single character to a 1-bit bitmap (16x32, LSB-first, 2 bytes per row = 64 bytes).
 */
export function renderCharToBitmap(char: string): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = CHAR_WIDTH;
  canvas.height = CHAR_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, CHAR_WIDTH, CHAR_HEIGHT);

  ctx.fillStyle = 'white';
  ctx.font = '20px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(char, CHAR_WIDTH / 2, CHAR_HEIGHT / 2);

  const imageData = ctx.getImageData(0, 0, CHAR_WIDTH, CHAR_HEIGHT);
  const bitmap = new Uint8Array(64); // 2 bytes per row * 32 rows

  for (let y = 0; y < CHAR_HEIGHT; y++) {
    for (let x = 0; x < CHAR_WIDTH; x++) {
      const pixelIdx = (y * CHAR_WIDTH + x) * 4;
      const isOn = imageData.data[pixelIdx] > 128 ? 1 : 0; // red channel threshold
      if (isOn) {
        bitmap[y * 2 + Math.floor(x / 8)] |= (1 << (x % 8));
      }
    }
  }

  return bitmap;
}

/**
 * Build the complete text command packet.
 */
export function buildTextCommand(
  text: string,
  textMode: number,
  speed: number,
  textColorMode: number,
  textColor: RGB,
  textBgMode: number,
  textBgColor: RGB,
): Uint8Array {
  // Build bitmaps with separators
  const parts: Uint8Array[] = [];
  for (const char of text) {
    parts.push(SEPARATOR);
    parts.push(renderCharToBitmap(char));
  }
  const textBitmaps = concatBytes(...parts);

  const numChars = text.length;

  // Text metadata (14 bytes)
  const numCharsBytes = int16LE(numChars);
  const textMetadata = new Uint8Array([
    numCharsBytes[0], numCharsBytes[1],
    0, 1, // static
    textMode & 0xff,
    speed & 0xff,
    textColorMode & 0xff,
    textColor[0], textColor[1], textColor[2],
    textBgMode & 0xff,
    textBgColor[0], textBgColor[1], textBgColor[2],
  ]);

  const packet = concatBytes(textMetadata, textBitmaps);

  // Header (16 bytes)
  const totalLen = packet.length + 16;
  const totalLenBytes = int16LE(totalLen);
  const packetLenBytes = int32LE(packet.length);
  const crcBytes = int32LE(crc32(packet));

  const header = new Uint8Array([
    totalLenBytes[0], totalLenBytes[1],
    3, 0, 0, // command: text
    packetLenBytes[0], packetLenBytes[1], packetLenBytes[2], packetLenBytes[3],
    crcBytes[0], crcBytes[1], crcBytes[2], crcBytes[3],
    0, 0, 12, // static footer
  ]);

  return concatBytes(header, packet);
}
