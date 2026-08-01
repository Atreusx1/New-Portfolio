/**
 * lineMaterial.ts — the companion to particleMaterial, for everything drawn
 * as lines: graph edges, hex outlines, the perspective grid.
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

  attribute float aAlpha;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = -mv.z;

    // Same distance-fade law as the particles, so lines and points recede
    // together instead of the wireframe outliving the field it belongs to.
    float depth = clamp((dist - uFadeNear) / (uFadeFar - uFadeNear), 0.0, 1.0);
    vAlpha = aAlpha * mix(1.0, 0.0, depth);

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
}

export const createLineMaterial = ({
  accentRaw,
  isDark,
  opacity = 1,
  fadeNear = 8,
  fadeFar = 34,
}: LineMaterialOptions): ShaderMaterial =>
  new ShaderMaterial({
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
    },
  });

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
