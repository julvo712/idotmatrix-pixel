export function turnOn(): Uint8Array {
  return new Uint8Array([5, 0, 7, 1, 1]);
}

export function turnOff(): Uint8Array {
  return new Uint8Array([5, 0, 7, 1, 0]);
}

export function setBrightness(percent: number): Uint8Array {
  const p = Math.max(5, Math.min(100, percent));
  return new Uint8Array([5, 0, 4, 128, p]);
}

export function setFlip(flipped: boolean): Uint8Array {
  return new Uint8Array([5, 0, 6, 128, flipped ? 1 : 0]);
}

export function freezeScreen(): Uint8Array {
  return new Uint8Array([4, 0, 3, 0]);
}

export function resetDevice(): Uint8Array {
  return new Uint8Array([0x04, 0x00, 0x03, 0x80]);
}

export function setTime(date: Date): Uint8Array {
  const year = date.getFullYear() % 100;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = date.getDay() === 0 ? 7 : date.getDay(); // 1=Mon..7=Sun
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return new Uint8Array([11, 0, 1, 128, year, month, day, weekday, hour, minute, second]);
}
