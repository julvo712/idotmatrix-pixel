import type { RGB } from '../types.ts';

const MAX_PIXELS = 255;

export function graffitiPixels(color: RGB, pixels: [number, number][]): Uint8Array {
  const n = Math.min(pixels.length, MAX_PIXELS);
  const size = 8 + 2 * n;
  const data = new Uint8Array(size);
  data[0] = size & 0xff;
  data[1] = (size >> 8) & 0xff;
  data[2] = 5; // graffiti mode
  data[3] = 1; // mirror mode
  data[4] = 0;
  data[5] = color[0] & 0xff;
  data[6] = color[1] & 0xff;
  data[7] = color[2] & 0xff;
  for (let i = 0; i < n; i++) {
    data[8 + 2 * i] = pixels[i][0] & 0xff;
    data[8 + 2 * i + 1] = pixels[i][1] & 0xff;
  }
  return data;
}
