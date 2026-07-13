/**
 * Types.ts
 *
 * Shared type definitions for the universe renderer.
 * Pure declarations only — no runtime code, so importing this file
 * can never create a circular-import problem.
 */

/** Blockchain node roles. Few validators, some relays, many clients. */
export type NodeKind = "validator" | "relay" | "client";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** Theme snapshot forwarded from React (ThemeContext) into the engine. */
export interface ThemeInput {
  /** Raw "r,g,b" accent string, e.g. "151,252,228". */
  accentRaw: string;
  isDark: boolean;
}

/** Everything a subsystem needs each frame, passed by the Renderer. */
export interface FrameContext {
  /** Seconds since last frame (clamped). */
  dt: number;
  /** Seconds since engine start — every animation keys off this, never frames. */
  time: number;
  /** Viewport size in CSS pixels. */
  width: number;
  height: number;
  /** 1 = full quality, 0 = reduced (adaptive). */
  quality: number;
  isDark: boolean;
  /** Parsed accent color. */
  accent: RGB;
}

/** Subsystems the Renderer owns all share this contract. */
export interface Subsystem {
  resize(width: number, height: number): void;
  update(frame: FrameContext): void;
  render(ctx: CanvasRenderingContext2D, frame: FrameContext): void;
}
