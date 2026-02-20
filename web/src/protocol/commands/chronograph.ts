export function chronograph(action: number): Uint8Array {
  return new Uint8Array([5, 0, 9, 128, action & 0xff]);
}
