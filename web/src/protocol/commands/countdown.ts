export function countdown(action: number, minutes: number, seconds: number): Uint8Array {
  return new Uint8Array([7, 0, 8, 128, action & 0xff, minutes & 0xff, seconds & 0xff]);
}
