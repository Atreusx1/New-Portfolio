/**
 * lineMaterial.ts — the companion to particleMaterial, for everything drawn
 * as lines: graph edges, hex outlines, the perspective grid, the globe lattice.
 *
 * Why not `LineBasicMaterial`: it has one opacity for the whole object, and
 * every line motif here needs *per-segment* alpha — an edge lit by a passing
 * packet, a hex fading with depth, a grid row dissolving at the horizon.
 * Faking that by scaling RGB works under additive blending and falls apart
 * completely under the light theme's normal blending, where dimming toward
 * black is the opposite of dimming toward paper.
 *
 * Note on line width: WebGL ignores `linewidth` on every major platform. These
 * are all 1px lines by design, which suits the hairline register the rest of
 * the site already uses (`--border` is a 0.08 alpha hairline).
 *
 * ── Stage 4 additions ──
 * The same two ideas as particleMaterial, so lines and points stay one
 * substance rather than two systems that happen to share a colour:
 *
 *  · **uEnergy / uEnergyGain** — the shared seam lift.
 *  · **uDisperse / uDisperseDist / uStagger** — the dispersal law from the
 *    particle shader, vertex for vertex. The globe's lattice needs it: without
 *    it the structure would sit still while the points it connects fly outward.
 *    Because each endpoint disperses along its *own* radial with its own delay,
 *    the lattice stretches and tears rather than translating, which is what a
 *    structure coming apart actually looks like. Inert at uDisperseDist = 0,
 *    which is the default and what every pre-existing caller gets.
 */
import {
  AdditiveBlending,
  NormalBlending,
  ShaderMaterial,
} from "three";
import { parseAccent } from "./particleMaterial";

const VERT = /* glsl */ `
  uniform float uFadeNear;
  uniform float uFadeFar;

  uniform float uEnergy;
  uniform float uEnergyGain;

  uniform float uDisperse;
  uniform float uDisperseDist;
  uniform float uStagger;
  uniform float uTighten;

  attribute float aAlpha;
  // Optional, and 0 when the geometry does not supply them: a line motif that
  // never disperses does not need to carry two dead buffers.
  attribute float aPhase;
  attribute float aJitter;

  varying float vAlpha;

  void main() {
    vec3 base = position * (1.0 - uTighten * aJitter);

    // Identical dispersal law to particleMaterial, including the guard: an
    // endpoint at the local origin must not become NaN on a motif whose
    // dispersal distance is zero.
    float delay = aPhase * uStagger;
    float d = clamp((uDisperse - delay) / max(1.0 - delay, 0.001), 0.0, 1.0);
    d = d * d * (3.0 - 2.0 * d);

    float len = length(base);
    vec3 dir = len > 1e-4 ? base / len : vec3(0.0);
    vec3 displaced = base + dir * d * uDisperseDist;

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    float dist = -mv.z;

    // Same distance-fade law as the particles, so lines and points recede
    // together instead of the wireframe outliving the field it belongs to.
    float depth = clamp((dist - uFadeNear) / (uFadeFar - uFadeNear), 0.0, 1.0);
    vAlpha = aAlpha * mix(1.0, 0.0, depth) * (1.0 + uEnergy * uEnergyGain);

    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    float a = vAlpha * uOpacity;
    if (a <= 0.001) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

export interface LineMaterialOptions {
  accentRaw: string;
  isDark: boolean;
  opacity?: number;
  fadeNear?: number;
  fadeFar?: number;
  /** How strongly this surface responds to shared seam energy. 0 opts out. */
  energyGain?: number;
  /** World units an endpoint travels at full dispersal. 0 disables dispersal. */
  disperseDist?: number;
  stagger?: number;
}

export const createLineMaterial = ({
  accentRaw,
  isDark,
  opacity = 1,
  fadeNear = 8,
  fadeFar = 34,
  energyGain = 0.3,
  disperseDist = 0,
  stagger = 0.45,
}: LineMaterialOptions): ShaderMaterial => {
  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: isDark ? AdditiveBlending : NormalBlending,
    uniforms: {
      uColor: { value: parseAccent(accentRaw) },
      uOpacity: { value: opacity },
      uFadeNear: { value: fadeNear },
      uFadeFar: { value: fadeFar },
      uEnergy: { value: 0 },
      uEnergyGain: { value: energyGain },
      uDisperse: { value: 0 },
      uDisperseDist: { value: disperseDist },
      uStagger: { value: stagger },
      uTighten: { value: 0 },
    },
  });

  // Same reasoning as particleMaterial: the graph's edge geometry carries
  // aAlpha and nothing else, so the dispersal attributes need a contractual
  // zero rather than whatever generic attribute state was left over.
  Object.assign(material.defaultAttributeValues, {
    aAlpha: [1],
    aPhase: [0],
    aJitter: [0],
  });

  return material;
};

/** Theme forwarding without rebuilding the material. */
export const applyLineTheme = (
  material: ShaderMaterial,
  accentRaw: string,
  isDark: boolean,
): void => {
  material.uniforms.uColor.value = parseAccent(accentRaw);
  material.blending = isDark ? AdditiveBlending : NormalBlending;
  material.needsUpdate = true;
};
