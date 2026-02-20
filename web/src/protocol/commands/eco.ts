export function ecoMode(
  enabled: boolean,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  brightness: number,
): Uint8Array {
  return new Uint8Array([
    10, 0, 2, 128,
    enabled ? 1 : 0,
    startHour & 0xff,
    startMinute & 0xff,
    endHour & 0xff,
    endMinute & 0xff,
    brightness & 0xff,
  ]);
}
