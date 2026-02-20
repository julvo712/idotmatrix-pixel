import type { RGB } from '../protocol/types.ts';

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export function rgbToHex(rgb: RGB): string {
  return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
}
