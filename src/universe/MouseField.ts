/**
 * MouseField.ts
 *
 * A soft gravity well around the cursor.
 *
 * · Listens on window (passive) — never touches React state.
 * · Nodes are *displaced toward* the cursor with a smooth falloff;
 *   the cursor never drags or owns a node.
 * · A global `influence` scalar eases 0→1 on entry and 1→0 on exit /
 *   idle, so the graph relaxes gracefully — no snapping.
 */

import { CONFIG } from "./Config";
import { damp, smoothstep } from "./Utils";
import type { FrameContext, Vec2 } from "./Types";

export class MouseField {
  private x = -10000;
  private y = -10000;
  private active = false;
  /** Eased 0..1 strength of the whole field. */
  private influence = 0;

  /** Reused output vector — offsetFor() never allocates. */
  private readonly out: Vec2 = { x: 0, y: 0 };

  private readonly onMove = (e: MouseEvent): void => {
    this.x = e.clientX;
    this.y = e.clientY;
    this.active = true;
  };

  private readonly onLeave = (): void => {
    this.active = false;
  };

  attach(): void {
    window.addEventListener("mousemove", this.onMove, { passive: true });
    window.addEventListener("mouseout", this.onLeave, { passive: true });
    window.addEventListener("blur", this.onLeave, { passive: true });
  }

  detach(): void {
    window.removeEventListener("mousemove", this.onMove);
    window.removeEventListener("mouseout", this.onLeave);
    window.removeEventListener("blur", this.onLeave);
  }

  update(frame: FrameContext): void {
    const target = this.active ? 1 : 0;
    const halfLife = this.active ? CONFIG.mouse.easeIn : CONFIG.mouse.easeOut;
    this.influence = damp(this.influence, target, halfLife, frame.dt);
  }

  /**
   * Displacement to apply to a point at (x, y).
   * Returns a shared vector — read immediately, never store.
   */
  offsetFor(x: number, y: number): Readonly<Vec2> {
    this.out.x = 0;
    this.out.y = 0;
    if (this.influence < 0.01) return this.out;

    const dx = this.x - x;
    const dy = this.y - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > CONFIG.mouse.radius || d < 1) return this.out;

    // Smooth bell falloff: zero at the rim, gentle near the center.
    const t = 1 - d / CONFIG.mouse.radius;
    const strength = smoothstep(0, 1, t) * CONFIG.mouse.pull * this.influence;
    this.out.x = (dx / d) * strength;
    this.out.y = (dy / d) * strength;
    return this.out;
  }

  /** Render a soft volumetric glow under the cursor. */
  render(ctx: CanvasRenderingContext2D, frame: FrameContext): void {
    if (this.influence < 0.02) return;
    const alpha =
      (frame.isDark ? CONFIG.mouse.glowAlphaDark : CONFIG.mouse.glowAlphaLight) *
      this.influence;
    const r = CONFIG.mouse.glowRadius;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    const { r: cr, g: cg, b: cb } = frame.accent;
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
  }
}
