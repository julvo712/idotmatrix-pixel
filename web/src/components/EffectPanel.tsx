import { useState } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { effect } from '../protocol/commands/effect.ts';
import { EffectStyle, EFFECT_STYLE_LABELS, type RGB } from '../protocol/types.ts';
import { hexToRgb } from '../lib/color-utils.ts';

const DEFAULT_COLORS = ['#ff0000', '#0000ff'];

export default function EffectPanel() {
  const { send, connected } = useDevice();
  const [style, setStyle] = useState(EffectStyle.GradientHorizontalRainbow as number);
  const [colors, setColors] = useState<string[]>(DEFAULT_COLORS);
  const [sending, setSending] = useState(false);

  const updateColor = (idx: number, val: string) => {
    const next = [...colors];
    next[idx] = val;
    setColors(next);
  };

  const addColor = () => {
    if (colors.length < 7) setColors([...colors, '#00ff00']);
  };

  const removeColor = (idx: number) => {
    if (colors.length > 2) setColors(colors.filter((_, i) => i !== idx));
  };

  const apply = async () => {
    setSending(true);
    try {
      const rgbColors: RGB[] = colors.map(c => hexToRgb(c));
      await send(effect(style, rgbColors));
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Effects</h2>

      <div>
        <label className="block text-sm mb-1">Style</label>
        <select value={style} onChange={e => setStyle(Number(e.target.value))}
          className="w-full bg-gray-700 rounded px-3 py-2">
          {Object.entries(EFFECT_STYLE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm mb-2">Colors ({colors.length}/7)</label>
        <div className="space-y-2">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={c} onChange={e => updateColor(i, e.target.value)}
                className="w-10 h-8 bg-transparent cursor-pointer" />
              <span className="text-sm text-gray-400">{c}</span>
              {colors.length > 2 && (
                <button onClick={() => removeColor(i)}
                  className="text-red-400 hover:text-red-300 text-sm ml-auto">Remove</button>
              )}
            </div>
          ))}
        </div>
        {colors.length < 7 && (
          <button onClick={addColor}
            className="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">
            + Add Color
          </button>
        )}
      </div>

      <button onClick={apply} disabled={!connected || sending}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded">
        Apply
      </button>
    </div>
  );
}
