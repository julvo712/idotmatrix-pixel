import { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { buildTextCommand } from '../protocol/commands/text.ts';
import { TextMode, TEXT_MODE_LABELS, TextColorMode, TEXT_COLOR_MODE_LABELS, type RGB } from '../protocol/types.ts';
import { hexToRgb } from '../lib/color-utils.ts';

export default function TextPanel() {
  const { send, connected } = useDevice();
  const [text, setText] = useState('Hello!');
  const [mode, setMode] = useState(TextMode.Marquee as number);
  const [speed, setSpeed] = useState(95);
  const [colorMode, setColorMode] = useState(TextColorMode.White as number);
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState('#000000');
  const [sending, setSending] = useState(false);

  const apply = async () => {
    if (!text) return;
    setSending(true);
    try {
      const rgb: RGB = hexToRgb(textColor);
      const bgRgb: RGB = hexToRgb(bgColor);
      const data = buildTextCommand(text, mode, speed, colorMode, rgb, bgEnabled ? 1 : 0, bgRgb);
      await send(data);
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Text</h2>

      <div>
        <label className="block text-sm mb-1">Text</label>
        <input type="text" value={text} onChange={e => setText(e.target.value)}
          className="w-full bg-gray-700 rounded px-3 py-2" placeholder="Enter text..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Mode</label>
          <select value={mode} onChange={e => setMode(Number(e.target.value))}
            className="w-full bg-gray-700 rounded px-3 py-2">
            {Object.entries(TEXT_MODE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Color Mode</label>
          <select value={colorMode} onChange={e => setColorMode(Number(e.target.value))}
            className="w-full bg-gray-700 rounded px-3 py-2">
            {Object.entries(TEXT_COLOR_MODE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Speed: {speed}</label>
        <input type="range" min={1} max={100} value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="w-full" />
      </div>

      <div className="flex gap-4 items-center">
        <div>
          <label className="block text-sm mb-1">Text Color</label>
          <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
            className="w-10 h-8 bg-transparent cursor-pointer" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm mb-1">
            <input type="checkbox" checked={bgEnabled} onChange={e => setBgEnabled(e.target.checked)} />
            Custom BG
          </label>
          {bgEnabled && (
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
              className="w-10 h-8 bg-transparent cursor-pointer" />
          )}
        </div>
      </div>

      <button onClick={apply} disabled={!connected || sending || !text}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded">
        Send Text
      </button>
    </div>
  );
}
