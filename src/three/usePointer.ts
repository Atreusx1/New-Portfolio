/**
 * usePointer.ts: where the 3D scene gets its cursor from.
 *
 * Not `useThree().pointer`, and that is not a stylistic preference. R3F's event
 * layer attaches its listeners to the canvas element, and this canvas is
 * `pointer-events: none` by necessity, it sits behind the entire document, and
 * any other value would swallow every click on the site. So the canvas never
 * receives a pointermove, and `state.pointer` stays at (0, 0) for the life of
 * the page. Anything reading it is reading a constant.
 *
 * A window-level listener sidesteps that completely, costs one passive event
 * handler, and keeps working regardless of what sits on top of the canvas.
 *
 * The hook writes to a **ref**, never to state, for the same reason
 * useFlightProgress does: a setState per pointermove would re-render the React
 * tree hundreds of times a second.
 */
import { useEffect, useRef, type MutableRefObject } from "react";
import type { PerspectiveCamera, Vector3 } from "three";

export interface PointerState {
  /** Normalised device coordinates, -1..1, (0,0) at viewport centre. */
  x: number;
  y: number;
  /** 1 while the pointer is over the document, 0 once it leaves or blurs. */
  active: number;
}

/**
 * Fine pointers only. A touch device has no hover state, so a repulsion field
 * driven by touch would either do nothing or fire once on tap and stick , 
 * exactly the jitter this effect is supposed to avoid. Same reasoning
 * useQuality already applies to `(pointer: coarse)` for tiering.
 */
export const hasFinePointer = (): boolean => {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(pointer: coarse)").matches;
};

export const usePointer = (enabled: boolean): MutableRefObject<PointerState> => {
  const state = useRef<PointerState>({ x: 0, y: 0, active: 0 });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      state.current.active = 0;
      return;
    }

    const onMove = (e: PointerEvent): void => {
      state.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      state.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      state.current.active = 1;
    };

    // Leaving the window must release the field rather than freezing it at the
    // last known position, or the globe keeps a dent in it after the cursor is
    // long gone.
    const onLeave = (): void => {
      state.current.active = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [enabled]);

  return state;
};

/**
 * Projects normalised pointer coordinates onto a plane at a given world z.
 *
 * One `unproject` per frame, total: not per particle. The alternative, a
 * Raycaster against the point cloud, would test every point in the shell every
 * frame and return the wrong thing anyway: the effect wants the cursor's
 * *position* in the globe's space, not whichever single point it happens to
 * be over.
 *
 * Writes into `out` and returns it, so the caller can keep one Vector3 for the
 * lifetime of the component and allocate nothing per frame.
 */
export const pointerOnPlane = (
  ndcX: number,
  ndcY: number,
  camera: PerspectiveCamera,
  planeZ: number,
  out: Vector3,
): Vector3 => {
  // z = 0.5 is any point on the ray; unproject gives it in world space.
  out.set(ndcX, ndcY, 0.5).unproject(camera);
  out.sub(camera.position);

  // Camera looks down -z, so dz is comfortably non-zero in practice; the guard
  // is for the degenerate frame where the dolly is exactly level with the plane.
  const dz = out.z;
  if (Math.abs(dz) < 1e-6) return out.copy(camera.position);

  return out.multiplyScalar((planeZ - camera.position.z) / dz).add(camera.position);
};
