// BLE Constants
export const BLE_SERVICE_UUID = '000000fa-0000-1000-8000-00805f9b34fb';
export const BLE_WRITE_CHARACTERISTIC = '0000fa02-0000-1000-8000-00805f9b34fb';
export const BLE_READ_CHARACTERISTIC = '0000fa03-0000-1000-8000-00805f9b34fb';
export const BLE_DEVICE_NAME_PREFIX = 'IDM-';

// Packet sizes
export const MTU_SIZE = 509;
export const CHUNK_SIZE_4K = 4096;
export const GIF_HEADER_SIZE = 16;
export const IMAGE_HEADER_SIZE = 9;

// Clock styles
export const ClockStyle = {
  RGBSwipeOutline: 0,
  ChristmasTree: 1,
  Checkers: 2,
  Color: 3,
  Hourglass: 4,
  AlarmClock: 5,
  Outlines: 6,
  RGBCorners: 7,
} as const;

export const CLOCK_STYLE_LABELS: Record<number, string> = {
  [ClockStyle.RGBSwipeOutline]: 'RGB Swipe Outline',
  [ClockStyle.ChristmasTree]: 'Christmas Tree',
  [ClockStyle.Checkers]: 'Checkers',
  [ClockStyle.Color]: 'Color',
  [ClockStyle.Hourglass]: 'Hourglass',
  [ClockStyle.AlarmClock]: 'Alarm Clock',
  [ClockStyle.Outlines]: 'Outlines',
  [ClockStyle.RGBCorners]: 'RGB Corners',
};

// Countdown actions
export const CountdownAction = {
  Stop: 0,
  Start: 1,
  Pause: 2,
  Restart: 3,
} as const;

// Chronograph actions
export const ChronographAction = {
  Reset: 0,
  Start: 1,
  Pause: 2,
  Resume: 3,
} as const;

// Effect styles
export const EffectStyle = {
  GradientHorizontalRainbow: 0,
  RandomColoredPixelsOnBlack: 1,
  RandomWhitePixelsOnChangingBg: 2,
  VerticalRainbow: 3,
  DiagonalRightRainbow: 4,
  DiagonalLeftRainbowOnBlack: 5,
  RandomColoredPixels: 6,
} as const;

export const EFFECT_STYLE_LABELS: Record<number, string> = {
  [EffectStyle.GradientHorizontalRainbow]: 'Gradient Horizontal Rainbow',
  [EffectStyle.RandomColoredPixelsOnBlack]: 'Random Colored Pixels (Black BG)',
  [EffectStyle.RandomWhitePixelsOnChangingBg]: 'Random White Pixels (Changing BG)',
  [EffectStyle.VerticalRainbow]: 'Vertical Rainbow',
  [EffectStyle.DiagonalRightRainbow]: 'Diagonal Right Rainbow',
  [EffectStyle.DiagonalLeftRainbowOnBlack]: 'Diagonal Left Rainbow (Black BG)',
  [EffectStyle.RandomColoredPixels]: 'Random Colored Pixels',
};

// Text modes
export const TextMode = {
  Replace: 0,
  Marquee: 1,
  ReversedMarquee: 2,
  VerticalRising: 3,
  VerticalLowering: 4,
  Blinking: 5,
  Fading: 6,
  Tetris: 7,
  Filling: 8,
} as const;

export const TEXT_MODE_LABELS: Record<number, string> = {
  [TextMode.Replace]: 'Replace',
  [TextMode.Marquee]: 'Marquee',
  [TextMode.ReversedMarquee]: 'Reversed Marquee',
  [TextMode.VerticalRising]: 'Vertical Rising',
  [TextMode.VerticalLowering]: 'Vertical Lowering',
  [TextMode.Blinking]: 'Blinking',
  [TextMode.Fading]: 'Fading',
  [TextMode.Tetris]: 'Tetris',
  [TextMode.Filling]: 'Filling',
};

// Text color modes
export const TextColorMode = {
  White: 0,
  RGB: 1,
  Rainbow1: 2,
  Rainbow2: 3,
  Rainbow3: 4,
  Rainbow4: 5,
} as const;

export const TEXT_COLOR_MODE_LABELS: Record<number, string> = {
  [TextColorMode.White]: 'White',
  [TextColorMode.RGB]: 'Custom RGB',
  [TextColorMode.Rainbow1]: 'Rainbow 1',
  [TextColorMode.Rainbow2]: 'Rainbow 2',
  [TextColorMode.Rainbow3]: 'Rainbow 3',
  [TextColorMode.Rainbow4]: 'Rainbow 4',
};

export type RGB = [number, number, number];
