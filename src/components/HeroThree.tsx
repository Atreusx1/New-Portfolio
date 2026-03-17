import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Color palette matching the Hero ──────────────────────────────────────────
const C_TEAL = 0x97fce4; // rgb(151,252,228)
const C_TEAL_MID = 0x4a9e8a;
const C_TEAL_DARK = 0x1a4a40;

// ─── Token orbit config ───────────────────────────────────────────────────────
const TOKENS = [
  { r: 2.2, speed: 0.42, phase: 0, tiltX: Math.PI / 3.2, tiltZ: 0 },
  { r: 2.2, speed: 0.42, phase: Math.PI, tiltX: Math.PI / 3.2, tiltZ: 0 },
  {
    r: 2.2,
    speed: 0.42,
    phase: Math.PI * 0.67,
    tiltX: Math.PI / 3.2,
    tiltZ: 0,
  },
  { r: 3.0, speed: 0.24, phase: 0.4, tiltX: Math.PI / 2.1, tiltZ: 0.6 },
  {
    r: 3.0,
    speed: 0.24,
    phase: Math.PI + 0.4,
    tiltX: Math.PI / 2.1,
    tiltZ: 0.6,
  },
  { r: 3.7, speed: 0.15, phase: 1.1, tiltX: 1.1, tiltZ: 1.0 },
];

export const HeroThree: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
    });

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);
    camera.position.set(0, 0.4, 7.5);
    camera.lookAt(0, 0, 0);

    // ── Mouse tracking ────────────────────────────────────────────────────────
    let mx = 0,
      my = 0;
    const onMouse = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const nW = mount.clientWidth,
        nH = mount.clientHeight;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // =========================================================================
    // SCENE OBJECTS
    // =========================================================================

    // ── 1. Central Torus Knot — the "bonding curve" ───────────────────────────
    const knotGeo = new THREE.TorusKnotGeometry(1.05, 0.3, 160, 20);

    // Wireframe shell — gives the structural lattice look
    const knotWireMesh = new THREE.Mesh(
      knotGeo,
      new THREE.MeshBasicMaterial({
        color: C_TEAL,
        wireframe: true,
        transparent: true,
        opacity: 0.1,
      }),
    );
    scene.add(knotWireMesh);

    // Solid inner tube — the glowing core
    const knotCoreMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.05, 0.055, 160, 10),
      new THREE.MeshBasicMaterial({
        color: C_TEAL,
        transparent: true,
        opacity: 0.55,
      }),
    );
    scene.add(knotCoreMesh);

    // Fake glow layers: 3 progressively larger/dimmer shells
    for (let i = 0; i < 3; i++) {
      const scale = 1 + i * 0.055;
      const glow = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.05 * scale, 0.055 * scale, 80, 8),
        new THREE.MeshBasicMaterial({
          color: C_TEAL,
          transparent: true,
          opacity: 0.09 - i * 0.027,
          side: THREE.BackSide,
        }),
      );
      scene.add(glow);
    }

    // ── 2. Orbital rings ──────────────────────────────────────────────────────
    const ringConfigs = [
      { r: 2.2, tube: 0.008, rx: Math.PI / 3.2, ry: 0, rz: 0, opacity: 0.18 },
      { r: 3.0, tube: 0.006, rx: Math.PI / 2.1, ry: 0, rz: 0.6, opacity: 0.11 },
      { r: 3.7, tube: 0.005, rx: 1.1, ry: 0.3, rz: 1.0, opacity: 0.07 },
    ];

    const rings = ringConfigs.map((rc) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(rc.r, rc.tube, 2, 120),
        new THREE.MeshBasicMaterial({
          color: C_TEAL,
          transparent: true,
          opacity: rc.opacity,
        }),
      );
      mesh.rotation.set(rc.rx, rc.ry, rc.rz);
      scene.add(mesh);
      return mesh;
    });

    // ── 3. Token node spheres on orbits ───────────────────────────────────────
    const nodeGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const glowGeo = new THREE.SphereGeometry(0.18, 16, 16);

    const tokenMeshes = TOKENS.map((td) => {
      const node = new THREE.Mesh(
        nodeGeo,
        new THREE.MeshBasicMaterial({ color: C_TEAL }),
      );

      // Glow halo around each token
      const halo = new THREE.Mesh(
        glowGeo,
        new THREE.MeshBasicMaterial({
          color: C_TEAL,
          transparent: true,
          opacity: 0.07,
          side: THREE.BackSide,
        }),
      );
      node.add(halo);
      scene.add(node);
      return { mesh: node, ...td };
    });

    // ── 4. Connection lines between token nodes ───────────────────────────────
    const MAX_SEGMENTS = TOKENS.length * TOKENS.length;
    const connBuffer = new Float32Array(MAX_SEGMENTS * 6);
    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute("position", new THREE.BufferAttribute(connBuffer, 3));
    const connLines = new THREE.LineSegments(
      connGeo,
      new THREE.LineBasicMaterial({
        color: C_TEAL,
        transparent: true,
        opacity: 0.14,
      }),
    );
    scene.add(connLines);

    // ── 5. Particle disk — the liquidity "galaxy" ─────────────────────────────
    const PARTICLE_COUNT = 900;
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    const pSizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Arms of a loose spiral/disk
      const arm = Math.floor(Math.random() * 3);
      const armAng = (arm / 3) * Math.PI * 2;
      const r = 0.6 + Math.random() ** 1.4 * 4.0;
      const theta = armAng + r * 0.45 + Math.random() * 0.9;
      const tiltX = Math.PI / 5.5;

      const x = r * Math.cos(theta);
      const yRaw = r * Math.sin(theta);
      const y = yRaw * Math.cos(tiltX) + (Math.random() - 0.5) * 0.25;
      const z = yRaw * Math.sin(tiltX) + (Math.random() - 0.5) * 0.25;

      pPositions[i * 3] = x;
      pPositions[i * 3 + 1] = y;
      pPositions[i * 3 + 2] = z;
      pSizes[i] = 0.6 + Math.random() * 1.6;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(pPositions, 3),
    );
    particleGeo.setAttribute("size", new THREE.BufferAttribute(pSizes, 1));

    const particleMat = new THREE.PointsMaterial({
      color: C_TEAL,
      size: 0.025,
      transparent: true,
      opacity: 0.48,
      sizeAttenuation: true,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // ── 6. Order book depth bars (bottom of scene) ────────────────────────────
    const BAR_COUNT = 32;
    const barMeshes: THREE.Mesh[] = [];
    const barHeights: number[] = [];
    const barTargets: number[] = [];

    for (let i = 0; i < BAR_COUNT; i++) {
      const isBid = i >= BAR_COUNT / 2;
      const h0 = 0.1 + Math.random() * 0.9;
      barHeights.push(h0);
      barTargets.push(h0);

      const barMat = new THREE.MeshBasicMaterial({
        color: isBid ? C_TEAL : C_TEAL_MID,
        transparent: true,
        opacity: isBid ? 0.28 : 0.18,
      });

      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.05), barMat);
      // Pivot at base — move by translating then scaling
      const x = (i - BAR_COUNT / 2) * 0.125;
      bar.position.set(x, -3.1 + 0.5, -0.8);
      bar.scale.y = h0;
      scene.add(bar);
      barMeshes.push(bar);
    }

    // ── 7. Horizontal mid-line grid ────────────────────────────────────────────
    // A flat grid plane at y = -3.1 to "ground" the depth bars
    const gridHelper = new THREE.GridHelper(9, 14, C_TEAL_DARK, C_TEAL_DARK);
    gridHelper.position.y = -3.1;
    gridHelper.position.z = -0.8;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    scene.add(gridHelper);

    // ── 8. Flowing edge particles on connections ──────────────────────────────
    const FLOW_COUNT = 80;
    const flowPositions = new Float32Array(FLOW_COUNT * 3);
    const flowGeo = new THREE.BufferGeometry();
    flowGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(flowPositions, 3),
    );
    const flowParticles = new THREE.Points(
      flowGeo,
      new THREE.PointsMaterial({
        color: C_TEAL,
        size: 0.05,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
      }),
    );
    scene.add(flowParticles);

    // Track flow state per particle
    const flowState = Array.from({ length: FLOW_COUNT }, () => ({
      a: Math.floor(Math.random() * TOKENS.length),
      b: Math.floor(Math.random() * TOKENS.length),
      t: Math.random(),
      speed: 0.6 + Math.random() * 0.8,
    }));

    // =========================================================================
    // ANIMATION LOOP
    // =========================================================================
    const clock = new THREE.Clock();
    let camTargX = 0,
      camTargY = 0;
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // ── Torus knot ──
      knotWireMesh.rotation.x = t * 0.17;
      knotWireMesh.rotation.y = t * 0.28;
      knotCoreMesh.rotation.x = t * 0.17;
      knotCoreMesh.rotation.y = t * 0.28;
      scene.children.forEach((c) => {
        if (
          c instanceof THREE.Mesh &&
          c !== knotWireMesh &&
          c !== knotCoreMesh &&
          c.geometry instanceof THREE.TorusKnotGeometry
        ) {
          c.rotation.x = t * 0.17;
          c.rotation.y = t * 0.28;
        }
      });

      // ── Rings ──
      rings[0].rotation.z = t * 0.14;
      rings[1].rotation.z = -t * 0.09;
      rings[2].rotation.z = t * 0.06;

      // ── Token orbits ──
      tokenMeshes.forEach((tn) => {
        const a = t * tn.speed + tn.phase;
        const x = tn.r * Math.cos(a);
        const yR = tn.r * Math.sin(a);
        const y = yR * Math.cos(tn.tiltX);
        const z = yR * Math.sin(tn.tiltX);
        // Apply tiltZ rotation around Z axis
        const cosZ = Math.cos(tn.tiltZ),
          sinZ = Math.sin(tn.tiltZ);
        tn.mesh.position.set(x * cosZ - y * sinZ, x * sinZ + y * cosZ, z);
        // Gentle self-rotation
        tn.mesh.rotation.y = t * 0.5;
      });

      // ── Connection lines ──
      let li = 0;
      const lp = connGeo.attributes.position as THREE.BufferAttribute;
      for (let a = 0; a < tokenMeshes.length; a++) {
        for (let b = a + 1; b < tokenMeshes.length; b++) {
          // Only draw "short" connections for a cleaner graph
          const pa = tokenMeshes[a].mesh.position;
          const pb = tokenMeshes[b].mesh.position;
          const dist = pa.distanceTo(pb);
          if (dist < 3.8) {
            lp.array[li++] = pa.x;
            lp.array[li++] = pa.y;
            lp.array[li++] = pa.z;
            lp.array[li++] = pb.x;
            lp.array[li++] = pb.y;
            lp.array[li++] = pb.z;
          }
        }
      }
      lp.needsUpdate = true;
      connGeo.setDrawRange(0, li / 3);

      // ── Flow particles along connection edges ──
      const fp = flowGeo.attributes.position as THREE.BufferAttribute;
      flowState.forEach((fs, i) => {
        fs.t += fs.speed * (1 / 60);
        if (fs.t > 1) {
          fs.t = 0;
          fs.a = Math.floor(Math.random() * TOKENS.length);
          fs.b = Math.floor(Math.random() * TOKENS.length);
          if (fs.a === fs.b) fs.b = (fs.b + 1) % TOKENS.length;
        }
        const pa = tokenMeshes[fs.a].mesh.position;
        const pb = tokenMeshes[fs.b].mesh.position;
        // Lerp with a slight arc
        const ease = fs.t;
        fp.array[i * 3] = pa.x + (pb.x - pa.x) * ease;
        fp.array[i * 3 + 1] =
          pa.y + (pb.y - pa.y) * ease + Math.sin(ease * Math.PI) * 0.4;
        fp.array[i * 3 + 2] = pa.z + (pb.z - pa.z) * ease;
      });
      fp.needsUpdate = true;

      // ── Particle disk drift ──
      particleSystem.rotation.y = t * 0.055;
      particleSystem.rotation.z = t * 0.018;

      // ── Depth bar animation ──
      if (Math.random() < 0.06) {
        const idx = Math.floor(Math.random() * BAR_COUNT);
        barTargets[idx] = 0.08 + Math.random() ** 1.5;
      }
      barMeshes.forEach((bar, i) => {
        barHeights[i] += (barTargets[i] - barHeights[i]) * 0.07;
        bar.scale.y = barHeights[i];
        // Keep base anchored at bottom
        bar.position.y = -3.1 + barHeights[i] * 0.5;
      });

      // ── Grid pulse ──
      (gridHelper.material as THREE.Material).opacity =
        0.12 + 0.08 * Math.sin(t * 0.8);

      // ── Camera parallax ──
      camTargX += (mx * 0.7 - camTargX) * 0.035;
      camTargY += (-my * 0.4 - camTargY) * 0.035;
      camera.position.x = camTargX;
      camera.position.y = 0.4 + camTargY;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // =========================================================================
    // CLEANUP
    // =========================================================================
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    />
  );
};
