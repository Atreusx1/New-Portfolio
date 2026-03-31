// import { useEffect, useRef } from "react";
// import { useTheme } from "../context/ThemeContext";

// // ── Config ────────────────────────────────────────────────────────────────────
// const NODE_COUNT = 65; // Slightly bumped for a richer web
// const MAX_DIST = 190;
// const PULSE_EVERY = 3200;
// const MIN_SPEED = 0.12;
// const MAX_SPEED = 0.38;

// interface Node {
//   x: number;
//   y: number;
//   vx: number;
//   vy: number;
//   pulseR: number;
//   pulsing: boolean;
//   pulseMax: number;
// }

// const makeNodes = (w: number, h: number): Node[] =>
//   Array.from({ length: NODE_COUNT }, () => {
//     const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
//     const angle = Math.random() * Math.PI * 2;
//     return {
//       x: Math.random() * w,
//       y: Math.random() * h,
//       vx: Math.cos(angle) * speed,
//       vy: Math.sin(angle) * speed,
//       pulseR: 0,
//       pulsing: false,
//       pulseMax: 28 + Math.random() * 22,
//     };
//   });

// // ─────────────────────────────────────────────────────────────────────────────
// export const SectionCanvas = () => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const accentRef = useRef("151,252,228");
//   const isDarkRef = useRef(true);
//   const t = useTheme();

//   useEffect(() => {
//     accentRef.current = t.accentRaw;
//     isDarkRef.current = t.isDark;
//   }, [t.accentRaw, t.isDark]);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     let W = window.innerWidth;
//     let H = window.innerHeight;
//     canvas.width = W;
//     canvas.height = H;

//     let nodes = makeNodes(W, H);

//     const resize = () => {
//       W = window.innerWidth;
//       H = window.innerHeight;
//       canvas.width = W;
//       canvas.height = H;
//       nodes = makeNodes(W, H);
//     };
//     window.addEventListener("resize", resize, { passive: true });

//     let pulseTimer = setTimeout(function triggerPulse() {
//       const idx = Math.floor(Math.random() * nodes.length);
//       if (!nodes[idx].pulsing) {
//         nodes[idx].pulsing = true;
//         nodes[idx].pulseR = 0;
//       }
//       const next = PULSE_EVERY * 0.5 + Math.random() * PULSE_EVERY;
//       pulseTimer = setTimeout(triggerPulse, next);
//     }, PULSE_EVERY);

//     let raf: number;

//     const draw = () => {
//       ctx.clearRect(0, 0, W, H);

//       const ac = accentRef.current;
//       const isDark = isDarkRef.current;

//       // ── The Fix: Adjusted Opacities ───────────────────────────
//       // Increased base alpha values so the network actually registers on high-res screens
//       const nodeDotAlpha = isDark ? 0.35 : 0.45; // Was 0.18 / 0.3
//       const lineBaseAlpha = isDark ? 0.15 : 0.22; // Was 0.06 / 0.1
//       const pulseAlpha = isDark ? 0.45 : 0.55; // Was 0.22 / 0.32

//       for (let i = 0; i < nodes.length; i++) {
//         const n = nodes[i];

//         n.x += n.vx;
//         n.y += n.vy;

//         if (n.x < 20) n.vx = Math.abs(n.vx);
//         if (n.x > W - 20) n.vx = -Math.abs(n.vx);
//         if (n.y < 20) n.vy = Math.abs(n.vy);
//         if (n.y > H - 20) n.vy = -Math.abs(n.vy);

//         // Pulse ring
//         if (n.pulsing) {
//           n.pulseR += 0.45;
//           const progress = n.pulseR / n.pulseMax;
//           if (progress <= 1) {
//             ctx.beginPath();
//             ctx.arc(n.x, n.y, n.pulseR, 0, Math.PI * 2);
//             ctx.strokeStyle = `rgba(${ac},${pulseAlpha * (1 - progress)})`;
//             ctx.lineWidth = 1.2; // Bumped from 0.8
//             ctx.stroke();
//           } else {
//             n.pulsing = false;
//             n.pulseR = 0;
//           }
//         }

//         // Node dot
//         ctx.beginPath();
//         ctx.arc(n.x, n.y, 2.0, 0, Math.PI * 2); // Radius bumped from 1.4 to 2.0
//         ctx.fillStyle = `rgba(${ac},${nodeDotAlpha})`;
//         ctx.fill();
//       }

//       // ── Connection lines (distance-faded) ───────────────────
//       for (let i = 0; i < nodes.length; i++) {
//         for (let j = i + 1; j < nodes.length; j++) {
//           const dx = nodes[i].x - nodes[j].x;
//           const dy = nodes[i].y - nodes[j].y;
//           const dist = Math.sqrt(dx * dx + dy * dy);
//           if (dist < MAX_DIST) {
//             const proximity = 1 - dist / MAX_DIST;
//             const alpha = lineBaseAlpha * proximity * proximity;
//             ctx.beginPath();
//             ctx.moveTo(nodes[i].x, nodes[i].y);
//             ctx.lineTo(nodes[j].x, nodes[j].y);
//             ctx.strokeStyle = `rgba(${ac},${alpha.toFixed(3)})`;
//             ctx.lineWidth = 0.8; // Bumped from 0.6
//             ctx.stroke();
//           }
//         }
//       }

//       // ── Nearest-neighbour bright pass (micro-detail) ─────────
//       for (let i = 0; i < nodes.length; i++) {
//         let nearest = Infinity,
//           ni = -1;
//         for (let j = 0; j < nodes.length; j++) {
//           if (j === i) continue;
//           const d = Math.hypot(
//             nodes[i].x - nodes[j].x,
//             nodes[i].y - nodes[j].y,
//           );
//           if (d < nearest) {
//             nearest = d;
//             ni = j;
//           }
//         }
//         if (ni !== -1 && nearest < 75) {
//           const a = lineBaseAlpha * 2.2 * (1 - nearest / 75);
//           ctx.beginPath();
//           ctx.moveTo(nodes[i].x, nodes[i].y);
//           ctx.lineTo(nodes[ni].x, nodes[ni].y);
//           ctx.strokeStyle = `rgba(${ac},${a.toFixed(3)})`;
//           ctx.lineWidth = 1.0; // Bumped from 0.5
//           ctx.stroke();
//         }
//       }

//       raf = requestAnimationFrame(draw);
//     };

//     draw();

//     return () => {
//       cancelAnimationFrame(raf);
//       clearTimeout(pulseTimer);
//       window.removeEventListener("resize", resize);
//     };
//   }, []);

//   return (
//     <canvas
//       ref={canvasRef}
//       style={{
//         position: "fixed",
//         inset: 0,
//         width: "100%",
//         height: "100%",
//         pointerEvents: "none",
//         zIndex: 0,
//       }}
//     />
//   );
// };

import { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

// ── Config ────────────────────────────────────────────────────────────────────
const NODE_COUNT = 65;
const MAX_DIST = 190;
const PULSE_EVERY = 3200;
const MIN_SPEED = 0.12;
const MAX_SPEED = 0.38;
const MOUSE_RADIUS = 150; // How far the mouse "reach" is

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pulseR: number;
  pulsing: boolean;
  pulseMax: number;
}

const makeNodes = (w: number, h: number): Node[] =>
  Array.from({ length: NODE_COUNT }, () => {
    const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      pulseR: 0,
      pulsing: false,
      pulseMax: 28 + Math.random() * 22,
    };
  });

export const SectionCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentRef = useRef("151,252,228");
  const isDarkRef = useRef(true);
  // Track mouse position
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const t = useTheme();

  useEffect(() => {
    accentRef.current = t.accentRaw;
    isDarkRef.current = t.isDark;
  }, [t.accentRaw, t.isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    let nodes = makeNodes(W, H);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      nodes = makeNodes(W, H);
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let pulseTimer = setTimeout(function triggerPulse() {
      const idx = Math.floor(Math.random() * nodes.length);
      if (!nodes[idx].pulsing) {
        nodes[idx].pulsing = true;
        nodes[idx].pulseR = 0;
      }
      const next = PULSE_EVERY * 0.5 + Math.random() * PULSE_EVERY;
      pulseTimer = setTimeout(triggerPulse, next);
    }, PULSE_EVERY);

    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const ac = accentRef.current;
      const isDark = isDarkRef.current;
      const mouse = mouseRef.current;

      const nodeDotAlpha = isDark ? 0.35 : 0.45;
      const lineBaseAlpha = isDark ? 0.15 : 0.22;
      const pulseAlpha = isDark ? 0.45 : 0.55;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 20) n.vx = Math.abs(n.vx);
        if (n.x > W - 20) n.vx = -Math.abs(n.vx);
        if (n.y < 20) n.vy = Math.abs(n.vy);
        if (n.y > H - 20) n.vy = -Math.abs(n.vy);

        // ── Mouse Interaction Logic ─────────────────────────────
        const mdx = n.x - mouse.x;
        const mdy = n.y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mDist < MOUSE_RADIUS) {
          const mProximity = 1 - mDist / MOUSE_RADIUS;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          // Brighten connections to the mouse
          ctx.strokeStyle = `rgba(${ac}, ${(lineBaseAlpha * mProximity * 2.5).toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }

        // Pulse ring
        if (n.pulsing) {
          n.pulseR += 0.45;
          const progress = n.pulseR / n.pulseMax;
          if (progress <= 1) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.pulseR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${ac},${pulseAlpha * (1 - progress)})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else {
            n.pulsing = false;
            n.pulseR = 0;
          }
        }

        // Node dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ac},${nodeDotAlpha})`;
        ctx.fill();
      }

      // Existing Connection lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const proximity = 1 - dist / MAX_DIST;
            const alpha = lineBaseAlpha * proximity * proximity;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${ac},${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(pulseTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};
