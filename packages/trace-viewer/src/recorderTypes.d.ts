export type ElementInfo = {
  selector: string;
  ariaSnapshot?: string;
  ref?: string;
};

export type Mode = 'recording' | 'inspecting' | 'none';

export type OverlayState = {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type UIState = {
  mode: Mode;
  recording: boolean;
  inspectors: number;
};
