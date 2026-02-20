import type { RGB } from '../types.ts';

export function effect(style: number, colors: RGB[]): Uint8Array {
  const n = colors.length;
  const data = new Uint8Array(6 + n * 3 + 1);
  data[0] = 6 + n * 3 + 1; // packet length includes the color count byte
  // Re-check: Python has [6 + len(processed_rgb_values), 0, 3, 2, style, 90, len, ...rgb]
  // That means length byte = 6 + n (not 6 + n*3). Let me re-read the Python.
  // Actually `processed_rgb_values` is a flat list of (r,g,b) tuples, and the
  // comprehension `for component in rgb` flattens them. But `len(processed_rgb_values)`
  // is the number of color tuples, not the flat count.
  // So data[0] = 6 + n_colors (number of tuples) - wait no, that doesn't match the
  // total byte length. Let me look again:
  //   data = bytearray([6 + len(processed_rgb_values), 0, 3, 2, style, 90, len(processed_rgb_values), ...])
  // Wait - that has 7 header bytes + n*3 color bytes = 7 + n*3 total bytes.
  // But data[0] = 6 + n. That seems intentional from the protocol.
  const totalLen = 7 + n * 3;
  const result = new Uint8Array(totalLen);
  result[0] = (6 + n) & 0xff; // protocol length field = 6 + num_colors
  result[1] = 0;
  result[2] = 3;
  result[3] = 2;
  result[4] = style & 0xff;
  result[5] = 90;
  result[6] = n & 0xff;
  for (let i = 0; i < n; i++) {
    result[7 + i * 3] = colors[i][0] & 0xff;
    result[7 + i * 3 + 1] = colors[i][1] & 0xff;
    result[7 + i * 3 + 2] = colors[i][2] & 0xff;
  }
  return result;
}
