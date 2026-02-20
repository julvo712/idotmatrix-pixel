export function scoreboard(count1: number, count2: number): Uint8Array {
  const c1 = Math.max(0, Math.min(999, count1));
  const c2 = Math.max(0, Math.min(999, count2));
  // Big-endian 16-bit, then bytes swapped into [low, high] order in the packet
  return new Uint8Array([
    8, 0, 10, 128,
    c1 & 0xff, (c1 >> 8) & 0xff,
    c2 & 0xff, (c2 >> 8) & 0xff,
  ]);
}
