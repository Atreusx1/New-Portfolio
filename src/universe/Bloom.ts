/**
 * Bloom.ts
 *
 * Fake bloom without WebGL.
 *
 * A single radial-gradient sprite (accent → transparent) is rendered once
 * to an offscreen canvas whenever the theme changes, then stamped with
 * `drawImage` at any scale. Drawing one cached bitmap N times is an order
 * of magnitude cheaper than building N radial gradients per frame.
 *
 * In dark mode the sprites are composited with `lighter` (additive) so
 * overlapping glows genuinely accumulate light; in light mode additive
 * blending would just wash to white, so we use normal blending at a
 * reduced intensity.
 */

import { CONFIG } from "./Config";
import { Graph } from "./Graph";
import { PacketManager } from "./PacketManager";
import type { FrameContext, RGB } from "./Types";

export class Bloom {
  private readonly sprite: HTMLCanvasElement;
  private spriteKey = "";

  constructor() {
    this.sprite = document.createElement("canvas");
    this.sprite.width = CONFIG.bloom.spriteSize;
    this.sprite.height = CONFIG.bloom.spriteSize;
  }

  /** Rebuild the glow sprite if the accent color changed. */
  private ensureSprite(accent: RGB): void {
    const key = `${accent.r},${accent.g},${accent.b}`;
    if (key === this.spriteKey) return;
    this.spriteKey = key;

    const size = CONFIG.bloom.spriteSize;
    const ctx = this.sprite.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${key},0.55)`);
    grad.addColorStop(0.35, `rgba(${key},0.18)`);
    grad.addColorStop(1, `rgba(${key},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  private stamp(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    const d = radius * 2;
    ctx.drawImage(this.sprite, x - radius, y - radius, d, d);
  }

  /** Draw glows for nodes, ripples and packets. Call before crisp geometry. */
  render(
    ctx: CanvasRenderingContext2D,
    frame: FrameContext,
    graph: Graph,
    packets: PacketManager,
  ): void {
    this.ensureSprite(frame.accent);

    const intensity = frame.isDark
      ? CONFIG.bloom.intensityDark
      : CONFIG.bloom.intensityLight;
    if (intensity <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = frame.isDark ? "lighter" : "source-over";

    // Node glows — validators always glow softly; others only when rippling.
    for (const node of graph.nodes) {
      const rip = node.rippleGlow(frame.time);
      let glow = 0;
      let radius = 0;
      if (node.kind === "validator") {
        glow = 0.35 + rip;
        radius = node.radius * CONFIG.bloom.validatorGlow;
      } else if (rip > 0.02) {
        glow = rip;
        radius =
          node.radius *
          (node.kind === "relay" ? CONFIG.bloom.relayGlow : CONFIG.bloom.clientGlow);
      } else {
        continue;
      }
      ctx.globalAlpha = Math.min(1, glow * intensity);
      this.stamp(ctx, node.x, node.y, radius + rip * 6);
    }

    // Packet glows.
    for (const p of packets.packets) {
      if (!p.alive) continue;
      ctx.globalAlpha = 0.8 * intensity;
      this.stamp(ctx, p.x, p.y, p.size * CONFIG.bloom.packetGlow);
    }

    ctx.restore();
  }
}
