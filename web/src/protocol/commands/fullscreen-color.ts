import type { RGB } from '../types.ts';

export function fullscreenColor(color: RGB): Uint8Array {
  return new Uint8Array([7, 0, 2, 2, color[0], color[1], color[2]]);
}
