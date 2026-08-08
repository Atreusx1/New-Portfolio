/**
 * DitherPanel.tsx
 *
 * An ordered-dither viewport for the Skills section: a lit form rendered to a
 * handful of tone levels and broken up with a Bayer threshold matrix, the way
 * a 1-bit display or a newsprint halftone would.
 *
 * ── Why this exists ──
 * The Skills section used to be a fake source file. It looked good and it
 * failed at its job: non-technical readers registered "this is code" and
 * skipped the entire section, which is the one place the site lists what the
 * work is actually made of. The rewrite puts plain language in front, and this
 * panel carries the visual interest that the syntax highlighting used to.
 *
 * ── Why a fullscreen quad rather than geometry ──
 * There is no mesh, no light and no material graph here. The whole image is
 * one triangle pair with a fragment shader: an analytic sphere (solve for z on
 * the unit disc, take the normal straight from the surface point) plus a
 * cheap fbm ripple. A real sphere with real lighting would cost more, look
 * softer, and then be thrown away by the quantiser anyway, because everything
 * downstream of the shading is reduced to four tone levels.
 *
 * That also keeps this honest about its cost. This page already runs a
 * full-document R3F canvas for the background; a second WebGL context is not
 * free, so this one is a single draw call with no depth buffer, no antialias,
 * and a clamped device pixel ratio.
 *
 * ── Tuned for grit, not for smoothness ──
 * The first version quantised to four tones through a 2px matrix, which reads
 * as a tasteful halftone. This one defaults to two: pure 1-bit, black or ink,
 * nothing between. That is what makes the stipple structural rather than
 * decorative, because at two levels the dither pattern *is* the shading, and
 * every gradient in the image has to be carried by dot density alone.
 *
 * The cell is also bigger. A 1px dither at a 2x device pixel ratio is invisible
 * on the device it matters on, which defeats the point of dithering at all.
 * Four device-independent pixels is coarse enough to read as a pattern from
 * normal viewing distance.
 *
 * `uTear` displaces horizontal bands against each other on a slow cycle. It is
 * the one piece of motion that is not smooth, and it is deliberate: everything
 * else on this page eases, so a hard step reads as a different kind of object.
 *
 * ── Bundle cost, and why this file is loaded on demand ──
 * Skills is the fourth section. Importing three.js here statically would pull
 * the whole library into the initial bundle for a panel nobody has scrolled to
 * yet. Skills.tsx lazy-loads this module and only mounts it once the section
 * has actually been revealed, so the cost is paid at the moment it buys
 * something. Default export, because React.lazy requires one.
 */
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color, SRGBColorSpace } from "three";
import type { Mesh } from "three";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // The quad is already in clip space; no camera transform is wanted.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAspect;
  uniform vec3  uInk;
  uniform vec3  uPaper;
  uniform float uMorph;    // 0..1, which skill group is active
  uniform float uEnergy;   // 0..1, eases up while a group is focused
  uniform float uLevels;   // tone steps before dithering
  uniform float uScale;    // dither cell size in pixels
  uniform float uContrast; // pushes midtones apart before quantising
  uniform float uTear;     // 0..1, horizontal band displacement

  varying vec2 vUv;

  // ── Ordered dither ──
  // The classic recursive Bayer construction. Written arithmetically rather
  // than as a lookup table because a const array plus dynamic indexing is the
  // one thing that still behaves differently across GLSL targets, and this
  // needs no texture upload.
  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

  // ── Value noise and a small fbm ──
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Centred, aspect-corrected coordinates.
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.4;

    float t = uTime * 0.18;

    // ── Tear ──
    // Quantise y into bands and shove alternating ones sideways. Stepped, not
    // eased: this is the one movement in the section that is allowed to be
    // abrupt.
    float band = floor(vUv.y * 22.0);
    float tearAmt = step(0.86, hash(vec2(band, floor(uTime * 2.2))));
    p.x += tearAmt * (hash(vec2(band, 7.0)) - 0.5) * 0.55 * uTear;
    float r = length(p);

    // Analytic sphere: on the disc, z is the height of the surface above it,
    // and for a unit sphere centred at the origin the surface point is its own
    // normal. No geometry, no depth test.
    float radius = 0.86;
    float inside = step(r, radius);
    float z = sqrt(max(radius * radius - r * r, 0.0));
    vec3 n = normalize(vec3(p, z));

    // The ripple is what makes each group read as a different object. uMorph
    // moves the frequency, so switching group visibly reshapes the surface
    // rather than only recolouring it.
    float freq = mix(2.6, 6.4, uMorph);
    float ripple = fbm(p * freq + vec2(t * 1.3, -t));
    n = normalize(n + vec3(ripple - 0.5) * (0.35 + uEnergy * 0.55));

    // One moving key light. Two would be invisible after quantisation.
    vec3 lightDir = normalize(vec3(cos(t * 1.6) * 0.8, 0.55, 0.9));
    float lambert = max(dot(n, lightDir), 0.0);
    float rim = pow(1.0 - abs(dot(n, vec3(0.0, 0.0, 1.0))), 2.0);

    float shade = lambert * 0.85 + rim * 0.5;

    // Outside the sphere: a soft field so the frame is never empty, falling
    // away fast enough that the silhouette stays the subject.
    float halo = exp(-(r - radius) * 3.2) * 0.42;
    halo *= fbm(p * 2.0 - vec2(t * 0.6)) * 0.9 + 0.35;

    float tone = mix(halo, shade, inside);
    tone = clamp(tone * (0.82 + uEnergy * 0.35), 0.0, 1.0);

    // Push midtones toward the extremes before quantising. At two levels there
    // is no midtone left to represent, so the contrast curve is what decides
    // where the boundary between ink and paper falls.
    tone = clamp((tone - 0.5) * uContrast + 0.5, 0.0, 1.0);

    // ── Quantise, then dither ──
    // The threshold is added *before* the floor, which is what turns the
    // banding into a stipple instead of hard contour lines.
    float threshold = bayer8(gl_FragCoord.xy / uScale) - 0.5;
    float levels = max(uLevels, 2.0);
    float quantised = floor(tone * levels + threshold + 0.5) / levels;

    vec3 col = mix(uPaper, uInk, clamp(quantised, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);

    #include <colorspace_fragment>
  }
`;

interface FieldProps {
  ink: string;
  paper: string;
  morph: number;
  still: boolean;
}

const Field = ({ ink, paper, morph, still }: FieldProps) => {
  const meshRef = useRef<Mesh>(null);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uInk: { value: new Color() },
          uPaper: { value: new Color() },
          uMorph: { value: 0 },
          uEnergy: { value: 0 },
          uLevels: { value: 2 },
          uScale: { value: 4 },
          uContrast: { value: 1.7 },
          uTear: { value: 1 },
        },
      }),
    [],
  );

  useFrame((state, delta) => {
    const u = material.uniforms;
    const dt = Math.min(delta, 1 / 20);

    // Frozen but still rendered under reduced motion: the image is the
    // content, the movement is the decoration.
    if (!still) u.uTime.value = state.clock.elapsedTime;

    u.uAspect.value = state.viewport.aspect;
    u.uInk.value.setStyle(ink, SRGBColorSpace);
    u.uPaper.value.setStyle(paper, SRGBColorSpace);

    // Eased rather than assigned, so switching group is a transition of the
    // surface rather than a jump cut.
    const k = still ? 1 : 1 - Math.exp(-6 * dt);
    u.uMorph.value += (morph - u.uMorph.value) * k;
    u.uEnergy.value += ((still ? 0.3 : 0.75) - u.uEnergy.value) * k;
    // No tearing under reduced motion. A stepped displacement is exactly the
    // kind of movement that setting exists to suppress.
    u.uTear.value = still ? 0 : 1;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export interface DitherPanelProps {
  /** The lit tone. Any CSS colour string. */
  ink: string;
  /** The unlit tone, normally the surface behind the panel. */
  paper: string;
  /** 0..1. Which group is active; reshapes the surface. */
  morph: number;
  still?: boolean;
}

const DitherPanel = ({
  ink,
  paper,
  morph,
  still = false,
}: DitherPanelProps) => (
  <Canvas
    aria-hidden="true"
    // No depth buffer, no antialias, no stencil: the output is four tone
    // levels through a threshold matrix, so none of them would survive.
    gl={{ antialias: false, depth: false, stencil: false, alpha: false }}
    dpr={[1, 1.75]}
    // Frozen under reduced motion, but rendered once so the panel is never a
    // blank rectangle.
    frameloop={still ? "demand" : "always"}
    style={{ pointerEvents: "none", display: "block" }}
  >
    <Field ink={ink} paper={paper} morph={morph} still={still} />
  </Canvas>
);

export default DitherPanel;
