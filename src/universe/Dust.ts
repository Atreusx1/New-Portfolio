/**
 * Dust.ts
 *
 * Digital dust: three parallax layers of tiny soft motes drifting slowly
 * upward with a sinusoidal sway. All particle state lives in TypedArrays
 * (x, y, phase per particle) and positions are derived from time —
 * nothing is allocated or integrated per frame.
 */

import { CONFIG } from "./Config";
import { createRandom, rgba } from "./Utils";
import type { FrameContext, Subsystem } from "./Types";

interface DustLayer {
  /** Base positions + per-particle phase: [x, y, phase] interleaved. */
  data: Float32Array;
  count: number;
  speed: number;
  size: number;
  alpha: number;
}

export class Dust implements Subsystem {
  private readonly layers: DustLayer[] = [];
  private readonly seed: number;
  private height = 0;

  constructor(seed: number) {
    this.seed = seed;
  }

  resize(width: number, height: number): void {
    this.height = height;
    this.layers.length = 0;
    const rand = createRandom(this.seed);
    const d = CONFIG.dust;

    for (let l = 0; l < d.counts.length; l++) {
      const count = d.counts[l];
      const data = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        data[i * 3] = rand() * width;
        data[i * 3 + 1] = rand() * height;
        data[i * 3 + 2] = rand() * Math.PI * 2;
      }
      this.layers.push({
        data,
        count,
        speed: d.speeds[l],
        size: d.sizes[l],
        alpha: d.alphas[l],
      });
    }
  }

  update(): void {
    /* positions derive from time in render() — nothing to integrate */
  }

  render(ctx: CanvasRenderingContext2D, frame: FrameContext): void {
    const d = CONFIG.dust;
    const TAU = Math.PI * 2;
    const h = this.height;
    // Reduced quality: skip the densest (far) layer.
    const startLayer = frame.quality < 1 ? 1 : 0;

    for (let l = startLayer; l < this.layers.length; l++) {
      const layer = this.layers[l];
      ctx.fillStyle = rgba(frame.accent, layer.alpha * (frame.isDark ? 1 : 0.8));
      ctx.beginPath();
      for (let i = 0; i < layer.count; i++) {
        const baseX = layer.data[i * 3];
        const baseY = layer.data[i * 3 + 1];
        const phase = layer.data[i * 3 + 2];
        // Time-based: upward drift wraps, sway oscillates.
        let y = (baseY - frame.time * layer.speed) % h;
        if (y < 0) y += h;
        const x =
          baseX + Math.sin((frame.time / d.swayPeriod) * TAU + phase) * d.swayAmp;
        ctx.moveTo(x + layer.size, y);
        ctx.arc(x, y, layer.size, 0, TAU);
      }
      ctx.fill();
    }
  }
}
