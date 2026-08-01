/**
 * particleMaterial.ts — one material for every particle surface in the app.
 *
 * Why a raw ShaderMaterial instead of PointsMaterial:
 *  · per-point size *and* per-point alpha (PointsMaterial gives neither cheaply)
 *  · distance fade, so the far side of the globe recedes instead of reading as
 *    a flat disc of dots — this is what sells the sphere without any lighting
 *  · a soft circular falloff instead of a texture lookup, so there is no sprite
 *    PNG to load, decode, or get wrong on a DPR change
 *  · dispersal happens on the GPU (stage 2). Moving 7,200 points on the CPU and
 *    re-uploading the position buffer every frame would stall the pipeline; a
 *    uniform-driven vertex displacement costs nothing.
 *
 * Blending is theme-dependent and that is deliberate: additive mint on #070808
 * glows, but additive anything on the light theme's warm paper just washes out
 * to white. Light mode uses normal blending so the deep-teal ink stays ink.
 */
import {
  AdditiveBlending,
  Color,
  NormalBlending,
  ShaderMaterial,
  SRGBColorSpace,
} from "three";

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTwinkle;
  uniform float uFadeNear;
  uniform float uFadeFar;
  uniform float uOpacity;

  // ── Dispersal (stage 2) ──────────────────────────────────────────────────
  uniform float uDisperse;      // 0 = shell intact, 1 = fully dispersed
  uniform float uDisperseDist;  // world units travelled at full dispersal
  uniform float uStagger;       // 0 = all points leave together, 1 = long tail

  // Guards against a point that has arrived near the camera filling the screen.
  uniform float uNearFade;
  uniform float uMaxSize;

  attribute float aScale;
  attribute float aPhase;

  varying float vAlpha;

  void main() {
    // Per-point delay so the shell peels rather than popping as one object.
    float delay = aPhase * uStagger;
    float d = clamp((uDisperse - delay) / max(1.0 - delay, 0.001), 0.0, 1.0);
    d = d * d * (3.0 - 2.0 * d); // smoothstep — same in/out feel as easeInOutCubic

    // Outward along the point's own radial. Uniform per-point direction keeps
    // the silhouette recognisable as an exploding sphere, not a puff of noise.
    vec3 dir = normalize(position);
    vec3 displaced = position + dir * d * uDisperseDist * (0.65 + aScale * 0.5);

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    float dist = -mv.z;

    // Slow per-point brightness oscillation. uTwinkle = 0 kills it entirely
    // for the reduced-motion path without swapping shaders.
    float tw = mix(1.0, 0.72 + 0.28 * sin(uTime + aPhase * 6.2831853), uTwinkle);

    // Perspective-correct sizing: points shrink with distance like real geometry.
    gl_PointSize = min(uSize * aScale * uPixelRatio * (1.0 / max(dist, 0.001)), uMaxSize);

    // Far fade — the back hemisphere dims rather than z-fighting for attention.
    float depth = clamp((dist - uFadeNear) / (uFadeFar - uFadeNear), 0.0, 1.0);

    // Near fade — a point passing through the camera dissolves instead of
    // smearing across the viewport as a giant translucent quad.
    float near = smoothstep(0.0, uNearFade, dist);

    vAlpha = mix(1.0, 0.14, depth) * near * tw * uOpacity;

    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    // gl_PointCoord is 0..1 across the quad; build a soft disc from its center.
    vec2 uv = gl_PointCoord - 0.5;
    float d2 = dot(uv, uv);
    if (d2 > 0.25) discard;

    float falloff = smoothstep(0.25, 0.0, d2);
    gl_FragColor = vec4(uColor, falloff * falloff * vAlpha);

    // Raw ShaderMaterial output is linear; this converts to the renderer's
    // output color space. Without it the mint reads noticeably dull.
    #include <colorspace_fragment>
  }
`;

export interface ParticleMaterialOptions {
  /** "151,252,228" — the raw tuple ThemeContext already exposes. */
  accentRaw: string;
  isDark: boolean;
  pixelRatio: number;
  /** Base point size before per-point scale. */
  size?: number;
  opacity?: number;
  fadeNear?: number;
  fadeFar?: number;
  disperseDist?: number;
  stagger?: number;
  nearFade?: number;
  maxSize?: number;
}

export const parseAccent = (accentRaw: string): Color => {
  const [r, g, b] = accentRaw.split(",").map((n) => Number(n.trim()) / 255);
  // Declaring sRGB lets three convert into its linear working space correctly.
  return new Color().setRGB(r || 0, g || 0, b || 0, SRGBColorSpace);
};

export const createParticleMaterial = ({
  accentRaw,
  isDark,
  pixelRatio,
  size = 26,
  opacity = 1,
  fadeNear = 3,
  fadeFar = 11,
  disperseDist = 0,
  stagger = 0.45,
  nearFade = 1.1,
  maxSize = 64,
}: ParticleMaterialOptions): ShaderMaterial =>
  new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: isDark ? AdditiveBlending : NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size },
      uPixelRatio: { value: pixelRatio },
      uTwinkle: { value: 1 },
      uFadeNear: { value: fadeNear },
      uFadeFar: { value: fadeFar },
      uOpacity: { value: opacity },
      uColor: { value: parseAccent(accentRaw) },
      uDisperse: { value: 0 },
      uDisperseDist: { value: disperseDist },
      uStagger: { value: stagger },
      uNearFade: { value: nearFade },
      uMaxSize: { value: maxSize },
    },
  });
