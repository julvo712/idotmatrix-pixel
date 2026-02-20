import { useState, useRef, useCallback, useEffect } from 'react';
import { useDevice } from '../context/DeviceContext.tsx';
import { graffitiPixels } from '../protocol/commands/graffiti.ts';
import { hexToRgb } from '../lib/color-utils.ts';
import type { RGB } from '../protocol/types.ts';

const GRID_SIZE = 64;
const CELL_PX = 6;

export default function GraffitiPanel() {
  const { send, connected } = useDevice();
  const [color, setColor] = useState('#ff0000');
  const [sending, setSending] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<(string | null)[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );
  const pendingRef = useRef<Set<string>>(new Set());
  const drawingRef = useRef(false);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const c = gridRef.current[y][x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX);
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_PX, 0);
      ctx.lineTo(i * CELL_PX, GRID_SIZE * CELL_PX);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_PX);
      ctx.lineTo(GRID_SIZE * CELL_PX, i * CELL_PX);
      ctx.stroke();
    }
  }, []);

  useEffect(() => { drawGrid(); }, [drawGrid]);

  const getCell = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / CELL_PX);
    const y = Math.floor((e.clientY - rect.top) * scaleY / CELL_PX);
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) return [x, y];
    return null;
  };

  const paintCell = (x: number, y: number) => {
    gridRef.current[y][x] = color;
    pendingRef.current.add(`${x},${y}`);
    drawGrid();
  };

  const flushPending = async () => {
    if (!connected || pendingRef.current.size === 0) return;
    const rgb: RGB = hexToRgb(color);
    const pixels: [number, number][] = [];
    for (const key of pendingRef.current) {
      const [x, y] = key.split(',').map(Number);
      pixels.push([x, y]);
    }
    pendingRef.current.clear();
    setSending(true);
    try {
      // Batch in groups of 255
      for (let i = 0; i < pixels.length; i += 255) {
        await send(graffitiPixels(rgb, pixels.slice(i, i + 255)), true);
      }
    } finally { setSending(false); }
  };

  const clearGrid = () => {
    gridRef.current = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    pendingRef.current.clear();
    drawGrid();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Graffiti</h2>

      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm mb-1">Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-10 h-8 bg-transparent cursor-pointer" />
        </div>
        <button onClick={clearGrid}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">
          Clear
        </button>
        {sending && <span className="text-sm text-yellow-400">Sending...</span>}
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_PX}
        height={GRID_SIZE * CELL_PX}
        className="border border-gray-600 cursor-crosshair"
        style={{ imageRendering: 'pixelated', maxWidth: '100%' }}
        onMouseDown={e => {
          drawingRef.current = true;
          const cell = getCell(e);
          if (cell) paintCell(cell[0], cell[1]);
        }}
        onMouseMove={e => {
          if (!drawingRef.current) return;
          const cell = getCell(e);
          if (cell) paintCell(cell[0], cell[1]);
        }}
        onMouseUp={() => {
          drawingRef.current = false;
          flushPending();
        }}
        onMouseLeave={() => {
          if (drawingRef.current) {
            drawingRef.current = false;
            flushPending();
          }
        }}
      />
    </div>
  );
}
