import { useState, useRef } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { gifPackets } from '../protocol/commands/gif.ts';

interface GiphyResult {
  id: string;
  title: string;
  preview_url: string;
  original_url: string;
}

export default function GifPanel() {
  const { sendPackets, connected, transportMode } = useDevice();
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState('');
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Giphy state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GiphyResult[]>([]);
  const [selectedGiphy, setSelectedGiphy] = useState<GiphyResult | null>(null);
  const [searching, setSearching] = useState(false);

  const handleFile = async (file: File) => {
    fileRef.current = file;
    setPreview(URL.createObjectURL(file));
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
        form.append('crop_x', '0.5');
        form.append('crop_y', '0.5');
        const res = await fetch('/api/upload/gif', { method: 'POST', body: form });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const buf = await fileRef.current.arrayBuffer();
        const gifData = new Uint8Array(buf);
        setProgress(`Uploading ${(gifData.length / 1024).toFixed(1)} KB...`);
        const packets = gifPackets(gifData);
        await sendPackets(packets, true);
      }
      setProgress('Done!');
    } catch (e) {
      setProgress(`Error: ${e instanceof Error ? e.message : 'Upload failed'}`);
    } finally {
      setSending(false);
    }
  };

  const searchGiphy = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSelectedGiphy(null);
    try {
      const res = await fetch(`/api/giphy/search?q=${encodeURIComponent(searchQuery)}&limit=24`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSearchResults(data.results);
    } catch (e) {
      setProgress(`Search error: ${e instanceof Error ? e.message : 'Search failed'}`);
    } finally {
      setSearching(false);
    }
  };

  const sendGiphy = async () => {
    if (!selectedGiphy || !connected) return;
    setSending(true);
    setProgress('Downloading and processing GIF...');
    try {
      const res = await fetch('/api/giphy/send-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedGiphy.original_url }),
      });
      if (!res.ok) throw new Error(await res.text());
      setProgress('Done!');
    } catch (e) {
      setProgress(`Error: ${e instanceof Error ? e.message : 'Send failed'}`);
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
      <h2 className="text-xl font-bold">GIF Upload</h2>

      {transportMode === 'server' && (
        <>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') searchGiphy(); }}
                placeholder="Search Giphy..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400"
              />
              <button
                onClick={searchGiphy}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto grid grid-cols-3 gap-2 p-2 bg-gray-800 rounded">
                {searchResults.map(gif => (
                  <img
                    key={gif.id}
                    src={gif.preview_url}
                    alt={gif.title}
                    onClick={() => setSelectedGiphy(gif)}
                    className={`w-full h-auto cursor-pointer rounded ${
                      selectedGiphy?.id === gif.id ? 'ring-2 ring-purple-400' : ''
                    }`}
                  />
                ))}
              </div>
            )}

            {selectedGiphy && (
              <button
                onClick={sendGiphy}
                disabled={!connected || sending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded"
              >
                {sending ? 'Sending...' : 'Send to Display'}
              </button>
            )}

            <p className="text-xs text-gray-500">Powered by GIPHY</p>
          </div>

          <hr className="border-gray-700" />
        </>
      )}

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-600 hover:border-gray-400 rounded-lg p-8 text-center cursor-pointer"
      >
        {preview ? (
          <img src={preview} alt="GIF Preview" className="mx-auto" style={{ maxWidth: 200, maxHeight: 200 }} />
        ) : (
          <p className="text-gray-400">Drop a GIF here or click to select</p>
        )}
        <input ref={inputRef} type="file" accept="image/gif" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      </div>

      <p className="text-xs text-gray-500">
        {transportMode === 'server'
          ? 'GIFs are automatically resized and cropped to 64x64 on the server.'
          : 'For best results, use a 64x64 GIF with <64 frames. The raw GIF bytes are sent directly to the device.'}
      </p>

      {progress && <p className="text-sm text-gray-300">{progress}</p>}

      <button onClick={upload} disabled={!connected || !fileRef.current || sending}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded">
        {sending ? 'Uploading...' : 'Upload to Display'}
      </button>
    </div>
  );
}
