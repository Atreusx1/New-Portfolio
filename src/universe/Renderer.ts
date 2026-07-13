/**
 * Renderer.ts
 *
 * The engine. Owns the canvas, the clock, and every subsystem.
 *
 * Lifecycle:  init() → [update(dt) → render()] per frame → destroy()
 * React never sees any of this — SectionCanvas only constructs / destroys.
 *
 * Draw order (back → front):
 *   Aurora → HexField → Grid → Dust → Bloom (glows) →
 *   Graph (edges + nodes) → Packets → Mouse glow
 *
 * Adaptive quality: smoothed frame time toggles a quality tier that
 * subsystems read from FrameContext (HexField drops, Dust thins) —
 * visual effects are always sacrificed before frame rate.
 */

import { CONFIG } from "./Config";
import { Aurora } from "./Aurora";
import { Bloom } from "./Bloom";
import { Dust } from "./Dust";
import { FlowField } from "./FlowField";
import { Graph } from "./Graph";
import { Grid } from "./Grid";
import { HexField } from "./HexField";
import { MouseField } from "./MouseField";
import { PacketManager } from "./PacketManager";
import { Ripple } from "./Ripple";
import { parseAccent } from "./Utils";
import type { FrameContext, RGB, ThemeInput } from "./Types";

const ENGINE_SEED = 1337;

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;

  // Subsystems.
  private readonly flow: FlowField;
  private readonly mouse: MouseField;
  private readonly graph: Graph;
  private readonly ripple: Ripple;
  private readonly packets: PacketManager;
  private readonly aurora: Aurora;
  private readonly dust: Dust;
  private readonly grid: Grid;
  private readonly hexes: HexField;
  private readonly bloom: Bloom;

  // Timing.
  private rafId = 0;
  private running = false;
  private lastTimestamp = 0;
  private elapsed = 0;
  private smoothedFrameMs = 16;
  private lastQualitySwitch = 0;

  // Theme (mutable via setTheme, read every frame — no reinitialization).
  private accent: RGB = parseAccent("151,252,228");
  private isDark = true;

  /** Single FrameContext instance reused every frame — zero allocation. */
  private readonly frame: FrameContext;

  private dpr = 1;
  private readonly onResize = (): void => this.resize();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.flow = new FlowField(ENGINE_SEED);
    this.mouse = new MouseField();
    this.graph = new Graph(ENGINE_SEED + 1, this.flow, this.mouse);
    this.ripple = new Ripple(this.graph);
    this.packets = new PacketManager(ENGINE_SEED + 2, this.graph, (validatorId) =>
      this.ripple.trigger(validatorId, this.elapsed),
    );
    this.aurora = new Aurora(ENGINE_SEED + 3);
    this.dust = new Dust(ENGINE_SEED + 4);
    this.grid = new Grid();
    this.hexes = new HexField(ENGINE_SEED + 5);
    this.bloom = new Bloom();

    this.frame = {
      dt: 0,
      time: 0,
      width: 0,
      height: 0,
      quality: 1,
      isDark: this.isDark,
      accent: this.accent,
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(): void {
    this.ctx = this.canvas.getContext("2d", { alpha: true });
    this.mouse.attach();
    window.addEventListener("resize", this.onResize, { passive: true });
    this.resize();
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.onResize);
    this.mouse.detach();
    this.ctx = null;
  }

  /** Forwarded from ThemeContext — cheap, no re-init, next frame picks it up. */
  setTheme(theme: ThemeInput): void {
    this.accent = parseAccent(theme.accentRaw);
    this.isDark = theme.isDark;
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = Math.min(CONFIG.maxDpr, window.devicePixelRatio || 1);

    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.frame.width = w;
    this.frame.height = h;

    this.graph.resize(w, h);
    this.packets.resize();
    this.ripple.resize();
    this.aurora.resize(w, h);
    this.dust.resize(w, h);
    this.grid.resize(w, h);
    this.hexes.resize(w, h);
  }

  // ── Frame loop ────────────────────────────────────────────────────────────

  private readonly loop = (timestamp: number): void => {
    if (!this.running) return;

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = Math.min(CONFIG.maxDt, Math.max(0, rawDt));
    this.elapsed += dt;

    // FPS smoothing + adaptive quality.
    const q = CONFIG.quality;
    this.smoothedFrameMs +=
      (rawDt * 1000 - this.smoothedFrameMs) * q.fpsSmoothing;
    const now = timestamp;
    if (now - this.lastQualitySwitch > q.switchCooldownMs) {
      if (this.frame.quality === 1 && this.smoothedFrameMs > q.degradeAboveMs) {
        this.frame.quality = 0;
        this.lastQualitySwitch = now;
      } else if (
        this.frame.quality === 0 &&
        this.smoothedFrameMs < q.recoverBelowMs
      ) {
        this.frame.quality = 1;
        this.lastQualitySwitch = now;
      }
    }

    // Populate the shared frame context.
    this.frame.dt = dt;
    this.frame.time = this.elapsed;
    this.frame.isDark = this.isDark;
    this.frame.accent = this.accent;

    this.update();
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    this.mouse.update(this.frame);
    this.graph.update(this.frame);
    this.packets.update(this.frame);
    // Aurora / Dust / Grid / HexField are stateless — pure functions of time.
  }

  private render(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.frame.width, this.frame.height);

    // Back → front.
    this.aurora.render(ctx, this.frame);
    this.hexes.render(ctx, this.frame);
    this.grid.render(ctx, this.frame);
    this.dust.render(ctx, this.frame);
    this.bloom.render(ctx, this.frame, this.graph, this.packets);
    this.graph.render(ctx, this.frame);
    this.packets.render(ctx, this.frame);
    this.mouse.render(ctx, this.frame);
  }
}
