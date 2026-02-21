import { useState, useRef, useCallback, useEffect } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { enableDIYMode, imagePackets } from '../protocol/commands/image.ts';
import { fileToRgbBytes, loadImage } from '../lib/image-utils.ts';

const CANVAS_SIZE = 64;
const PREVIEW_SIZE = 256;

export default function ImagePanel() {
  const { send, sendPackets, connected, transportMode } = useDevice();
  const [preview, setPreview] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState('');
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    fileRef.current = file;
    const img = await loadImage(file);
    setImgDimensions({ w: img.width, h: img.height });
    setPreview(URL.createObjectURL(file));
    setCropOffset({ x: 0.5, y: 0.5 });
  };

  const upload = async () => {
    if (!fileRef.current || !connected) return;
    setSending(true);
    setProgress('Uploading...');
    try {
      if (transportMode === 'server') {
        const form = new FormData();
        form.append('file', fileRef.current);
        form.append('resize_mode', 'fill');
        form.append('crop_x', String(cropOffset.x));
        form.append('crop_y', String(cropOffset.y));
        const res = await fetch('/api/upload/image', { method: 'POST', body: form });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const rgbData = await fileToRgbBytes(fileRef.current, CANVAS_SIZE);
        await send(enableDIYMode(), true);
        const packets = imagePackets(rgbData);
        await sendPackets(packets, true);
      }
      setProgress('Done!');
    } catch (e) {
      setProgress(`Error: ${e instanceof Error ? e.message : 'Upload failed'}`);
    } finally {
      setSending(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const isNonSquare = imgDimensions && imgDimensions.w !== imgDimensions.h;
  const showViewfinder = transportMode === 'server' && preview && isNonSquare;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Image Upload</h2>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => !preview && inputRef.current?.click()}
        className={`border-2 border-dashed border-gray-600 hover:border-gray-400 rounded-lg p-4 text-center ${!preview ? 'cursor-pointer' : ''}`}
      >
        {showViewfinder ? (
          <CropViewfinder
            src={preview}
            imgW={imgDimensions!.w}
            imgH={imgDimensions!.h}
            offset={cropOffset}
            onOffsetChange={setCropOffset}
          />
        ) : preview ? (
          <img src={preview} alt="Preview" className="mx-auto" style={{ width: 128, height: 128, imageRendering: 'pixelated', objectFit: 'cover' }} />
        ) : (
          <p className="text-gray-400">Drop an image here or click to select</p>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      </div>

      {preview && (
        <button onClick={() => inputRef.current?.click()} className="text-sm text-blue-400 hover:text-blue-300">
          Choose different image
        </button>
      )}

      {progress && <p className="text-sm text-gray-300">{progress}</p>}

      <button onClick={upload} disabled={!connected || !fileRef.current || sending}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded">
        {sending ? 'Uploading...' : 'Upload to Display'}
      </button>
    </div>
  );
}


function CropViewfinder({
  src, imgW, imgH, offset, onOffsetChange,
}: {
  src: string;
  imgW: number;
  imgH: number;
  offset: { x: number; y: number };
  onOffsetChange: (o: { x: number; y: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Scale image to fit in PREVIEW_SIZE while maintaining aspect ratio
  const scale = Math.min(PREVIEW_SIZE / imgW, PREVIEW_SIZE / imgH);
  const dispW = Math.round(imgW * scale);
  const dispH = Math.round(imgH * scale);

  // The crop square size matches the shorter dimension (since fill scales to shorter side)
  const cropDisplaySize = Math.min(dispW, dispH);

  // Compute crop square position from offset (0–1)
  const maxMoveX = dispW - cropDisplaySize;
  const maxMoveY = dispH - cropDisplaySize;
  const cropLeft = maxMoveX * offset.x;
  const cropTop = maxMoveY * offset.y;

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Image offset within the container
    const imgLeft = (PREVIEW_SIZE - dispW) / 2;
    const imgTop = (PREVIEW_SIZE - dispH) / 2;

    const relX = e.clientX - rect.left - imgLeft - cropDisplaySize / 2;
    const relY = e.clientY - rect.top - imgTop - cropDisplaySize / 2;

    const newX = maxMoveX > 0 ? Math.max(0, Math.min(1, relX / maxMoveX)) : 0.5;
    const newY = maxMoveY > 0 ? Math.max(0, Math.min(1, relY / maxMoveY)) : 0.5;
    onOffsetChange({ x: newX, y: newY });
  }, [dispW, dispH, cropDisplaySize, maxMoveX, maxMoveY, onOffsetChange]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div className="inline-block select-none">
      <div
        ref={containerRef}
        className="relative mx-auto"
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
      >
        {/* Image centered in container */}
        <img
          src={src}
          alt="Preview"
          draggable={false}
          className="absolute"
          style={{
            width: dispW,
            height: dispH,
            left: (PREVIEW_SIZE - dispW) / 2,
            top: (PREVIEW_SIZE - dispH) / 2,
            opacity: 0.4,
          }}
        />
        {/* Bright crop region */}
        <div
          className="absolute overflow-hidden"
          style={{
            width: cropDisplaySize,
            height: cropDisplaySize,
            left: (PREVIEW_SIZE - dispW) / 2 + cropLeft,
            top: (PREVIEW_SIZE - dispH) / 2 + cropTop,
          }}
        >
          <img
            src={src}
            alt="Cropped"
            draggable={false}
            style={{
              width: dispW,
              height: dispH,
              marginLeft: -cropLeft,
              marginTop: -cropTop,
            }}
          />
        </div>
        {/* Draggable crop border */}
        <div
          onPointerDown={() => { dragging.current = true; }}
          className="absolute border-2 border-blue-400 cursor-move"
          style={{
            width: cropDisplaySize,
            height: cropDisplaySize,
            left: (PREVIEW_SIZE - dispW) / 2 + cropLeft,
            top: (PREVIEW_SIZE - dispH) / 2 + cropTop,
          }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">Drag the crop region to adjust</p>
    </div>
  );
}
