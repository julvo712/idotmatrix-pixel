import { useState, useRef } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { enableDIYMode, imagePackets } from '../protocol/commands/image.ts';
import { fileToRgbBytes, fileToPreviewUrl } from '../lib/image-utils.ts';

const CANVAS_SIZE = 64;

export default function ImagePanel() {
  const { send, sendPackets, connected } = useDevice();
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState('');
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    fileRef.current = file;
    const url = await fileToPreviewUrl(file, CANVAS_SIZE);
    setPreview(url);
  };

  const upload = async () => {
    if (!fileRef.current || !connected) return;
    setSending(true);
    setProgress('Preparing...');
    try {
      const rgbData = await fileToRgbBytes(fileRef.current, CANVAS_SIZE);
      setProgress('Enabling DIY mode...');
      await send(enableDIYMode(), true);
      setProgress('Uploading image...');
      const packets = imagePackets(rgbData);
      await sendPackets(packets, true);
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Image Upload</h2>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-600 hover:border-gray-400 rounded-lg p-8 text-center cursor-pointer"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="mx-auto" style={{ width: 128, height: 128, imageRendering: 'pixelated' }} />
        ) : (
          <p className="text-gray-400">Drop an image here or click to select</p>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      </div>

      {progress && <p className="text-sm text-gray-300">{progress}</p>}

      <button onClick={upload} disabled={!connected || !fileRef.current || sending}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded">
        {sending ? 'Uploading...' : 'Upload to Display'}
      </button>
    </div>
  );
}
