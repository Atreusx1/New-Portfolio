/**
 * particleMaterial.ts: one material for every particle surface in the app.
 *
 * Why a raw ShaderMaterial instead of PointsMaterial:
 *  · per-point size *and* per-point alpha (PointsMaterial gives neither cheaply)
 *  · distance fade, so the far side of the globe recedes instead of reading as
 *    a flat disc of dots: this is what sells the sphere without any lighting
 *  · a soft circular falloff instead of a texture lookup, so there is no sprite
 *    PNG to load, decode, or get wrong on a DPR change
 *  · dispersal happens on the GPU (stage 2). Moving 7,200 points on the CPU and
 *    re-uploading the position buffer every frame would stall the pipeline; a
 *    uniform-driven vertex displacement costs nothing.
 *
 * Blending is theme-dependent and that is deliberate: additive mint on #070808
 * glows, but additive anything on the light theme's warm paper just washes out
 * to white. Light mode uses normal blending so the ink stays ink.
 *
 * ── Stage 4 additions ──
 * Three uniforms, all inert at their defaults, so every existing call site
 * behaves exactly as it did before:
 *
 *  · **uEnergy / uEnergyGain**: the connective thread. `uEnergy` is the same
 *    number for every material in the scene (useMotif.handoffEnergy), and
 *    `uEnergyGain` is how much this particular surface cares. Six motifs
 *    brightening off one shared value is what makes a seam read as one
 *    substance changing shape rather than two unrelated effects crossing over.
 *  · **uRim**: a Fresnel-style rim term. A point cloud has no normals, but on
 *    a *shell* the surface normal is the radial, so it comes for free. Enabled
 *    only for spherical fields, where that identity actually holds.
 *  · **uTighten**: collapses the per-point radial jitter that gives a shell its
 *    thickness, letting an object resolve from a loose cloud into a clean
 *    surface without a second buffer or a second material.
 *
 * ── Stage 5: light mode is a different medium, not a different palette ──
 * Swapping AdditiveBlending for NormalBlending was necessary and nowhere near
 * sufficient. Additive light on near-black *accumulates*: overlapping points
 * build bright cores, and the soft quadratic falloff reads as glow because glow
 * is what stacking translucent light looks like. None of that survives the
 * inversion. On paper a point can only ever subtract toward its own colour, so
 * the same geometry rendered the same way gives you a faint blue smudge with no
 * core, no accumulation, and no glow to stand in for structure.
 *
 * Paper has its own vocabulary for the same job, and it is the one engravers
 * used: smaller marks, harder edges, more of them, and *aerial perspective* , 
 * distance reads as things getting lighter, not as things fading out. Four
 * uniforms, all set from `isDark` in one place:
 *
 *  · **uEdge**: blends the falloff between quadratic (1.0, the dark-mode glow
 *    curve, bit-identical to before) and linear (0.0, a crisp stippled dot).
 *    A lerp rather than a pow() because this runs per fragment on every point
 *    in the scene and pow is not free at that volume.
 *  · **uAlphaFloor**: how much alpha a point retains at maximum distance.
 *    Dark wants 0.14: the far hemisphere should recede into black. Paper wants
 *    much more, because a mark that fades to nothing on white has not receded,
 *    it has been erased.
 *  · **uThemeGain**: ink is not additive, so light mode simply needs more of
 *    it. Per-surface via uLightGain, since the starfield and the globe want
 *    very different amounts.
 *  · **uSizeScale**: smaller points in light mode. Density carries structure
 *    on paper; size carries it under additive blending.
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

  // ── Shared seam energy (stage 4) ─────────────────────────────────────────
  uniform float uEnergy;        // 0..1, identical across every motif
  uniform float uEnergyGain;    // per-surface sensitivity; 0 opts out entirely

  // ── Shell detail (stage 4) ───────────────────────────────────────────────
  uniform float uRim;           // 0 = off. Radial-normal Fresnel, shells only.
  uniform float uTighten;       // 1 = radial jitter collapsed to a clean surface

  // ── Medium (stage 5) ─────────────────────────────────────────────────────
  uniform float uAlphaFloor;    // alpha retained at maximum distance
  uniform float uThemeGain;     // ink multiplier; 1.0 in dark
  uniform float uSizeScale;     // point size multiplier; 1.0 in dark

  // Guards against a point that has arrived near the camera filling the screen.
  uniform float uNearFade;
  uniform float uMaxSize;

  attribute float aScale;
  attribute float aPhase;
  // Signed radial jitter already baked into position by fibonacciSphere.
  // Absent on non-shell geometries, where WebGL supplies 0 and uTighten is a
  // no-op regardless of its value.
  attribute float aJitter;

  varying float vAlpha;

  void main() {
    // Un-bake the shell's thickness on demand. Exact to first order in the
    // jitter fraction, which is <= 0.08 everywhere it is used.
    vec3 base = position * (1.0 - uTighten * aJitter);

    // Per-point delay so the shell peels rather than popping as one object.
    float delay = aPhase * uStagger;
    float d = clamp((uDisperse - delay) / max(1.0 - delay, 0.001), 0.0, 1.0);
    d = d * d * (3.0 - 2.0 * d); // smoothstep, same in/out feel as easeInOutCubic

    // Outward along the point's own radial. Uniform per-point direction keeps
    // the silhouette recognisable as an exploding sphere, not a puff of noise.
    // Guarded: normalize(vec3(0)) is NaN, and NaN * 0.0 is still NaN, so an
    // un-guarded point sitting at the local origin would vanish permanently
    // even on a motif that never disperses at all.
    float len = length(base);
    bool radial = len > 1e-4;
    vec3 dir = radial ? base / len : vec3(0.0);
    vec3 displaced = base + dir * d * uDisperseDist * (0.65 + aScale * 0.5);

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    float dist = -mv.z;

    // Slow per-point brightness oscillation. uTwinkle = 0 kills it entirely
    // for the reduced-motion path without swapping shaders.
    float tw = mix(1.0, 0.72 + 0.28 * sin(uTime + aPhase * 6.2831853), uTwinkle);

    // The connective thread. Size carries more of it than alpha because under
    // additive blending a bigger point deposits more energy in the same place,
    // the same encoding the graph already uses for node glow.
    float energy = uEnergy * uEnergyGain;

    // Rim light. On a shell the radial *is* the normal, so silhouette points
    // brighten and the cloud reads as a solid object instead of a flat disc of
    // dots. Meaningless where dir is not a surface normal, hence uRim = 0 by
    // default and set only by the two globes.
    // Same guard again, and it is not redundant: normalize(vec3(0.0)) is NaN,
    // and mix(1.0, NaN, 0.0) is NaN too, so an unguarded rim would poison every
    // motif that sets uRim to zero rather than only the ones that use it.
    vec3 nrm = radial ? normalize(normalMatrix * dir) : vec3(0.0, 0.0, 1.0);
    vec3 viewDir = normalize(-mv.xyz);
    // Clamped before pow: a dot product that rounds just past 1.0 would make
    // the base negative, and pow() of a negative base is undefined in GLSL.
    float fres = pow(max(0.0, 1.0 - abs(dot(nrm, viewDir))), 2.5);
    float rim = mix(1.0, 0.58 + 1.6 * fres, uRim);

    // Perspective-correct sizing: points shrink with distance like real geometry.
    gl_PointSize = min(
      uSize * uSizeScale * aScale * uPixelRatio * (1.0 + energy) * (1.0 / max(dist, 0.001)),
      uMaxSize
    );

    // Far fade: the back hemisphere dims rather than z-fighting for attention.
    float depth = clamp((dist - uFadeNear) / (uFadeFar - uFadeNear), 0.0, 1.0);

    // Near fade: a point passing through the camera dissolves instead of
    // smearing across the viewport as a giant translucent quad.
    float near = smoothstep(0.0, uNearFade, dist);

    // Aerial perspective. The floor is the whole difference between "receding"
    // and "gone": on black, 0.14 is a point sinking into the dark; on paper the
    // same 0.14 is a point that has simply been rubbed out.
    vAlpha = mix(1.0, uAlphaFloor, depth)
           * near * tw * rim
           * (1.0 + energy * 0.6)
           * uThemeGain
           * uOpacity;

    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uEdge;
  varying float vAlpha;

  void main() {
    // gl_PointCoord is 0..1 across the quad; build a soft disc from its center.
    vec2 uv = gl_PointCoord - 0.5;
    float d2 = dot(uv, uv);
    if (d2 > 0.25) discard;

    float falloff = smoothstep(0.25, 0.0, d2);
    // uEdge 1.0 is falloff*falloff, the original curve exactly. 0.0 is linear,
    // which on paper reads as a drawn dot instead of a haze. A mix rather than
    // pow(falloff, n): this is the hottest fragment path in the app.
    float shape = falloff * mix(1.0, falloff, uEdge);
    gl_FragColor = vec4(uColor, shape * vAlpha);

    // Raw ShaderMaterial output is linear; this converts to the renderer's
    // output color space. Without it the mint reads noticeably dull.
    #include <colorspace_fragment>
  }
`;

export interface ParticleMaterialOptions {
  /** "151,252,228": the raw tuple ThemeContext already exposes. */
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
  /** How strongly this surface responds to shared seam energy. 0 opts out. */
  energyGain?: number;
  /** Radial-normal Fresnel strength. Spherical shells only: 0 elsewhere. */
  rim?: number;
  /**
   * Alpha multiplier applied in light mode only. Surfaces differ a lot here:
   * the globe wants real ink, the starfield is dust behind body copy and wants
   * noticeably less than it gets in dark mode.
   */
  lightGain?: number;
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
  energyGain = 0.3,
  rim = 0,
  lightGain = 1.45,
}: ParticleMaterialOptions): ShaderMaterial => {
  const material = new ShaderMaterial({
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
      uEnergy: { value: 0 },
      uEnergyGain: { value: energyGain },
      uRim: { value: rim },
      uTighten: { value: 0 },
      // Defaults are the dark-mode values, so a material that is never handed
      // to applyParticleTheme behaves exactly as it did before stage 5.
      uEdge: { value: 1 },
      uAlphaFloor: { value: 0.14 },
      uThemeGain: { value: 1 },
      uSizeScale: { value: 1 },
      uLightGain: { value: lightGain },
    },
  });

  /**
   * Only the shells supply aJitter; the drift field, the graph and the grid
   * marks do not. Left unspecified, a declared-but-unbound attribute reads
   * WebGL's *generic* vertex attribute, which is global state shared across
   * draw calls: so its value would be whatever the previous draw happened to
   * leave there. Naming the default makes it zero by contract rather than by
   * luck.
   *
   * Merged rather than assigned: ShaderMaterial ships defaults for `color` and
   * `uv` in its constructor, and replacing the object would quietly drop them.
   */
  Object.assign(material.defaultAttributeValues, {
    aScale: [1],
    aPhase: [0],
    aJitter: [0],
  });

  return material;
};

/**
 * Theme forwarding without rebuilding the material: the counterpart to
 * `applyLineTheme`, which several motifs were open-coding identically.
 */
export const applyParticleTheme = (
  material: ShaderMaterial,
  accentRaw: string,
  isDark: boolean,
): void => {
  const u = material.uniforms;
  u.uColor.value = parseAccent(accentRaw);
  material.blending = isDark ? AdditiveBlending : NormalBlending;

  // The medium switch. Every motif already routes its theme change through
  // here, so light mode's whole particle treatment is these four lines rather
  // than a conditional in each of the six.
  u.uEdge.value = isDark ? 1 : 0.22;
  u.uAlphaFloor.value = isDark ? 0.14 : 0.3;
  u.uThemeGain.value = isDark ? 1 : (u.uLightGain.value as number);
  u.uSizeScale.value = isDark ? 1 : 0.8;

  material.needsUpdate = true;
};
