/**
 * Aurora.ts
 *
 * Very slow atmospheric color wash behind everything.
 *
 * Three radial gradients wander on simplex-noise paths. They're rendered
 * into an offscreen canvas at 1/8 resolution and upscaled with bilinear
 * smoothing — that's both dramatically cheaper than full-res gradients
 * and produces the soft, banding-free look we want.
 */

import { CONFIG } from "./Config";
import { SimplexNoise } from "./Utils";
import type { FrameContext, Subsystem } from "./Types";

/** The aurora drifts over minutes — repainting its gradients faster than this is invisible. */
const REPAINT_INTERVAL_S = 0.08;

export class Aurora implements Subsystem {
  private readonly noise: SimplexNoise;
  private readonly buffer: HTMLCanvasElement;
  private readonly bctx: CanvasRenderingContext2D | null;
  private width = 0;
  private height = 0;
  private lastPaint = -Infinity;
  private lastAccentKey = "";

  constructor(seed: number) {
    this.noise = new SimplexNoise(seed);
    this.buffer = document.createElement("canvas");
    this.bctx = this.buffer.getContext("2d");
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const s = CONFIG.aurora.downscale;
    this.buffer.width = Math.max(1, Math.ceil(width / s));
    this.buffer.height = Math.max(1, Math.ceil(height / s));
    this.lastPaint = -Infinity; // force repaint after resize
  }

  update(): void {
    /* stateless — everything derives from time in render() */
  }

  private repaint(frame: FrameContext): void {
    const b = this.bctx;
    if (!b) return;

    const bw = this.buffer.width;
    const bh = this.buffer.height;
    b.clearRect(0, 0, bw, bh);

    const t = frame.time * CONFIG.aurora.timeScale;
    const radius = Math.max(bw, bh) * CONFIG.aurora.radiusFraction;
    const { r, g, b: bl } = frame.accent;

    for (let i = 0; i < CONFIG.aurora.blobs; i++) {
      // Each blob wanders its own noise channel — organic, never looping.
      const nx = this.noise.noise3(i * 7.31, 0.5, t);
      const ny = this.noise.noise3(0.5, i * 5.17, t + 100);
      const cx = bw * (0.5 + nx * 0.42);
      const cy = bh * (0.5 + ny * 0.42);
      const pulse = 0.75 + 0.25 * this.noise.noise3(i * 3.7, i * 1.3, t * 1.7);

      const grad = b.createRadialGradient(cx, cy, 0, cx, cy, radius * pulse);
      grad.addColorStop(0, `rgba(${r},${g},${bl},0.5)`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      b.fillStyle = grad;
      b.fillRect(0, 0, bw, bh);
    }
  }

  render(ctx: CanvasRenderingContext2D, frame: FrameContext): void {
    if (!this.bctx) return;
    // Fill-rate is this layer's whole cost and it's the subtlest effect —
    // first to go if the adaptive tier says we're struggling.
    if (frame.quality < 1) return;

    // Repaint the small buffer at a low cadence (or on accent change);
    // the per-frame cost is just one upscaled blit.
    const accentKey = `${frame.accent.r},${frame.accent.g},${frame.accent.b}`;
    if (
      frame.time - this.lastPaint >= REPAINT_INTERVAL_S ||
      accentKey !== this.lastAccentKey
    ) {
      this.repaint(frame);
      this.lastPaint = frame.time;
      this.lastAccentKey = accentKey;
    }

    ctx.save();
    ctx.globalAlpha = frame.isDark
      ? CONFIG.aurora.alphaDark
      : CONFIG.aurora.alphaLight;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buffer, 0, 0, this.width, this.height);
    ctx.restore();
  }
}
