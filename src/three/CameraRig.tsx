/**
 * CameraRig.tsx: the whole flight path, in one place.
 *
 * Deliberately the only thing in the app that touches the camera.
 *
 * ── Leg 1: the dive (t 0 → 1) ──
 *  · **z** eases from 6.2 out front to −1.4, behind the shell's original
 *    radius. The camera genuinely passes through rather than stopping at the
 *    surface, which is what makes particles stream past instead of swelling
 *    and vanishing.
 *  · **fov** widens 52° → 76°. This is doing most of the work: a pure dolly
 *    reads as "things got bigger"; a dolly with a widening fov reads as speed.
 *
 * ── Legs 2–5: the corridor (t > 1) ──
 *  · **z** becomes linear in t: one section is one `CORRIDOR.spacing`. Linear
 *    is correct here and eased would be wrong: the scroll bar is the throttle,
 *    so travel must be proportional to it or the page feels like it is fighting
 *    the wheel.
 *  · **fov** relaxes from the dive's 76° spike back to a 60° cruise. Holding 76
 *    for five sections is exhausting and distorts the edges of wide displays.
 *  · **x/y** sway on two out-of-phase sinusoids. Without it, a five-section
 *    flight down a straight −z line reads as a tube and the eye stops
 *    registering forward motion entirely.
 *
 * Everything is damped, so scrolling up is the same curve reversed and a
 * nav jump from Contact to Home arrives as a glide rather than a cut.
 */
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, type PerspectiveCamera } from "three";
import { CORRIDOR, FLIGHT, MOTION, damp } from "./motion";
import type { FlightState } from "./useFlightProgress";
import type { MutableRefObject } from "react";

export interface CameraRigProps {
  flight: MutableRefObject<FlightState>;
  /** Reduced motion parks the camera at rest and never moves it. */
  still?: boolean;
}

/** World-space z of the camera at flight coordinate `t`. */
export const cameraZAt = (t: number): number => {
  if (t <= 1) {
    return MathUtils.lerp(
      FLIGHT.camera.zRest,
      FLIGHT.camera.zBreak,
      MOTION.easeInOutCubic(MathUtils.clamp(t, 0, 1)),
    );
  }
  return FLIGHT.camera.zBreak - (t - 1) * CORRIDOR.spacing;
};

export const CameraRig = ({ flight, still = false }: CameraRigProps) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  // Explicitly widened: FLIGHT is `as const`, so inference would pin these to
  // the literal types 6.2 and 52 and reject every subsequent write.
  const current = useRef<{ z: number; fov: number; x: number; y: number }>({
    z: FLIGHT.camera.zRest,
    fov: FLIGHT.camera.fovRest,
    x: 0,
    y: 0,
  });

  useFrame((_, delta) => {
    if (still) return;
    const dt = Math.min(delta, 1 / 20);

    const t = Math.max(0, flight.current.t);
    const dive = MathUtils.clamp(t, 0, 1);
    const e = MOTION.easeInOutCubic(dive);

    const targetZ = cameraZAt(t);

    // fov: rest → dive spike → cruise. The second lerp only engages past t=1,
    // so leg 1 behaves exactly as it did in stage 2: an explicit goal, since
    // that leg was already signed off.
    const diveFov = MathUtils.lerp(
      FLIGHT.camera.fovRest,
      FLIGHT.camera.fovBreak,
      e,
    );
    const settle = MathUtils.clamp((t - 1) / 0.5, 0, 1);
    const targetFov = MathUtils.lerp(
      diveFov,
      CORRIDOR.fovCruise,
      MOTION.easeOutCubic(settle),
    );

    // Sway ramps in only after the breakthrough: swaying during the dive
    // would read as the camera losing its aim at the exact moment it needs to
    // look purposeful.
    const swayAmount = MathUtils.clamp(t - 1, 0, 1);
    const targetX =
      Math.sin((t / CORRIDOR.swayPeriodX) * Math.PI * 2) *
      CORRIDOR.swayX *
      swayAmount;
    const targetY =
      Math.cos((t / CORRIDOR.swayPeriodY) * Math.PI * 2) *
      CORRIDOR.swayY *
      swayAmount;

    current.current.z = damp(current.current.z, targetZ, MOTION.lambda.camera, dt);
    current.current.x = damp(current.current.x, targetX, MOTION.lambda.camera, dt);
    current.current.y = damp(current.current.y, targetY, MOTION.lambda.camera, dt);
    current.current.fov = damp(
      current.current.fov,
      targetFov,
      MOTION.lambda.camera,
      dt,
    );

    camera.position.set(current.current.x, current.current.y, current.current.z);

    // Aim slightly ahead down the corridor rather than at the origin, so the
    // sway tilts the view instead of orbiting a fixed point.
    camera.lookAt(
      current.current.x * 0.35,
      current.current.y * 0.35,
      current.current.z - 12,
    );

    // updateProjectionMatrix is not free, so only pay for it when the fov has
    // actually moved a visible amount. Damping converges asymptotically and
    // would otherwise keep this firing forever at the tail.
    if (Math.abs(camera.fov - current.current.fov) > 0.01) {
      camera.fov = current.current.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
};
