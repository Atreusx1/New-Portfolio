/**
 * HexField.ts
 *
 * A handful of enormous, nearly invisible hexagon outlines at different
 * depths, rotating over minutes. They register subconsciously as
 * structure — "blocks" — without ever competing with content.
 */

import { CONFIG } from "./Config";
import { createRandom, randRange, rgba } from "./Utils";
import type { FrameContext, Subsystem } from "./Types";

interface Hex {
  x: number; // as viewport fractions so resize keeps composition
  y: number;
  radiusFrac: number;
  spinPeriod: number; // seconds per full rotation
  direction: 1 | -1;
  phase: number;
  depth: number; // 0..1 → alpha scaling
}

export class HexField implements Subsystem {
  private readonly hexes: Hex[] = [];
  private width = 0;
  private height = 0;

  constructor(seed: number) {
    const rand = createRandom(seed);
    const h = CONFIG.hex;
    for (let i = 0; i < h.count; i++) {
      this.hexes.push({
        x: rand(),
        y: rand(),
        radiusFrac: randRange(rand, h.radiusMin, h.radiusMax),
        spinPeriod: randRange(rand, h.spinMin, h.spinMax),
        direction: rand() > 0.5 ? 1 : -1,
        phase: rand() * Math.PI * 2,
        depth: 0.4 + rand() * 0.6,
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(): void {
    /* stateless */
  }

  render(ctx: CanvasRenderingContext2D, frame: FrameContext): void {
    if (frame.quality < 1) return; // first thing to drop under load

    const minEdge = Math.min(this.width, this.height);
    const TAU = Math.PI * 2;

    ctx.save();
    ctx.lineWidth = 1;
    for (const hex of this.hexes) {
      const cx = hex.x * this.width;
      const cy = hex.y * this.height;
      const r = hex.radiusFrac * minEdge;
      const angle =
        hex.phase + hex.direction * (frame.time / hex.spinPeriod) * TAU;

      ctx.strokeStyle = rgba(frame.accent, CONFIG.hex.alpha * hex.depth);
      ctx.beginPath();
      for (let v = 0; v < 6; v++) {
        const a = angle + (v / 6) * TAU;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (v === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
}
