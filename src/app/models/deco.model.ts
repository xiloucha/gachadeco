export type PenType =
  | 'normal'
  | 'outline'
  | 'polkadot'
  | 'stripe'
  | 'sparkle'
  | 'neon'
  | 'gradient';

export type BackgroundType =
  | 'solid'
  | 'gradient'
  | 'polkadot'
  | 'stripe'
  | 'sparkle'
  | 'handwritten';

export type AspectRatioType = '4:3' | '3:4' | '9:16';

export interface Point {
  x: number;
  y: number;
}

export interface PenConfig {
  type: PenType;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  size: number;
  isEraser: boolean;
}

export interface Stroke {
  id: string;
  points: Point[];
  pen: PenConfig;
  seed: number;
}

export interface BackgroundConfig {
  type: BackgroundType;
  label: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface HeiseiPalette {
  primary: string;
  secondary: string;
  name: string;
}

export interface AspectRatioOption {
  id: AspectRatioType;
  label: string;
  width: number;
  height: number;
}
