/**
 * Grid.ts
 *
 * A subtle perspective floor occupying the bottom of the viewport:
 * converging verticals plus horizontals that scroll away toward the
 * horizon on a perspective curve, all fading to nothing at the horizon
 * line. The whole layer is masked with a vertical gradient so it melts
 * into the scene rather than ending at a hard line.
 */

import { CONFIG } from "./Config";
import { rgba } from "./Utils";
import type { FrameContext, Subsystem } from "./Types";

export class Grid implements Subsystem {
  private width = 0;
  private height = 0;
  /** Cached vertical fade mask (rebuilt on resize / theme flip). */
  private mask: CanvasGradient | null = null;
  private maskKey = "";

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.mask = null;
  }

  update(): void {
    /* stateless */
  }

  private ensureMask(ctx: CanvasRenderingContext2D, frame: FrameContext): CanvasGradient {
    const key = `${frame.accent.r},${frame.accent.g},${frame.accent.b},${frame.isDark}`;
    if (this.mask && key === this.maskKey) return this.mask;
    this.maskKey = key;

    const top = this.height * (1 - CONFIG.grid.heightFraction);
    const alpha = frame.isDark ? CONFIG.grid.alphaDark : CONFIG.grid.alphaLight;
    const grad = ctx.createLinearGradient(0, top, 0, this.height);
    grad.addColorStop(0, rgba(frame.accent, 0));
    grad.addColorStop(0.55, rgba(frame.accent, alpha));
    grad.addColorStop(1, rgba(frame.accent, alpha * 0.7));
    this.mask = grad;
    return grad;
  }

  render(ctx: CanvasRenderingContext2D, frame: FrameContext): void {
    const gcfg = CONFIG.grid;
    const w = this.width;
    const h = this.height;
    const horizonY = h * (1 - gcfg.heightFraction);
    const vanishX = w / 2;

    ctx.save();
    ctx.strokeStyle = this.ensureMask(ctx, frame);
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Converging verticals.
    for (let c = 0; c <= gcfg.columns; c++) {
      const xBottom = (c / gcfg.columns) * w * 1.6 - w * 0.3; // overscan edges
      ctx.moveTo(vanishX + (xBottom - vanishX) * 0.12, horizonY);
      ctx.lineTo(xBottom, h);
    }

    // Horizontals scrolling toward the horizon (time-based, seamless loop).
    const scroll = (frame.time / gcfg.scrollPeriod) % (1 / gcfg.rows);
    for (let r = 0; r <= gcfg.rows; r++) {
      const t = r / gcfg.rows + scroll;
      if (t > 1) continue;
      // Perspective: quadratic spacing — rows bunch up near the horizon.
      const y = horizonY + (h - horizonY) * t * t;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }

    ctx.stroke();
    ctx.restore();
  }
}
