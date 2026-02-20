import type { RGB } from '../types.ts';

export function showClock(
  style: number,
  showDate: boolean,
  hour24: boolean,
  color: RGB = [255, 255, 255],
): Uint8Array {
  const flags = (style & 0x3f) | (showDate ? 128 : 0) | (hour24 ? 64 : 0);
  return new Uint8Array([8, 0, 6, 1, flags, color[0], color[1], color[2]]);
}
