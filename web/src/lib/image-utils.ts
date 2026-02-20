/**
 * Load a File, resize to canvasSize x canvasSize, return raw RGB bytes.
 */
export async function fileToRgbBytes(file: File, canvasSize: number): Promise<Uint8Array> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d')!;

  // Fill with black background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Fit image maintaining aspect ratio
  const scale = Math.min(canvasSize / img.width, canvasSize / img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const x = Math.round((canvasSize - w) / 2);
  const y = Math.round((canvasSize - h) / 2);
  ctx.drawImage(img, x, y, w, h);

  const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize);
  const rgb = new Uint8Array(canvasSize * canvasSize * 3);
  for (let i = 0; i < canvasSize * canvasSize; i++) {
    rgb[i * 3] = imageData.data[i * 4];
    rgb[i * 3 + 1] = imageData.data[i * 4 + 1];
    rgb[i * 3 + 2] = imageData.data[i * 4 + 2];
  }
  return rgb;
}

/**
 * Load a File as an HTMLImageElement.
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get a preview data URL from a File resized to canvasSize.
 */
export async function fileToPreviewUrl(file: File, canvasSize: number): Promise<string> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const scale = Math.min(canvasSize / img.width, canvasSize / img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const x = Math.round((canvasSize - w) / 2);
  const y = Math.round((canvasSize - h) / 2);
  ctx.drawImage(img, x, y, w, h);

  return canvas.toDataURL();
}
