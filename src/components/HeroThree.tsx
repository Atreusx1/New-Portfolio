import { useEffect, useRef } from "react";
import * as THREE from "three";

// Dark: bright mint teal. Light: dark emerald teal (matches rgb(0,128,100))
const DARK_TEAL = 0x97fce4;
const LIGHT_TEAL = 0x008064;

const C_WARM = 0xffd590;

const TOKENS = [
  { r: 2.4, speed: 0.38, phase: 0, tiltX: Math.PI / 3.2, tiltZ: 0 },
  { r: 2.4, speed: 0.38, phase: Math.PI, tiltX: Math.PI / 3.2, tiltZ: 0 },
  {
    r: 2.4,
    speed: 0.38,
    phase: Math.PI * 0.67,
    tiltX: Math.PI / 3.2,
    tiltZ: 0,
  },
  { r: 3.2, speed: 0.22, phase: 0.4, tiltX: Math.PI / 2.1, tiltZ: 0.6 },
  {
    r: 3.2,
    speed: 0.22,
    phase: Math.PI + 0.4,
    tiltX: Math.PI / 2.1,
    tiltZ: 0.6,
  },
  { r: 3.9, speed: 0.14, phase: 1.1, tiltX: 1.1, tiltZ: 1.0 },
];

interface HeroThreeProps {
  isDark?: boolean;
}

export const HeroThree: React.FC<HeroThreeProps> = ({ isDark = true }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const C_TEAL = isDark ? DARK_TEAL : LIGHT_TEAL;
    const C_TEAL_MID = isDark ? 0x4a9e8a : 0x005040;
    const C_TEAL_DARK = isDark ? 0x1a4a40 : 0x003028;

    const W = mount.clientWidth,
      H = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    camera.position.set(0, 0.3, 8.0);
    camera.lookAt(0, 0, 0);

    let mx = 0,
      my = 0;
    const onMouse = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    const onResize = () => {
      const nW = mount.clientWidth,
        nH = mount.clientHeight;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // ── Tether logo ───────────────────────────────────────────────
    const tetherGrp = new THREE.Group();
    scene.add(tetherGrp);

    const S = 1.32;
    const CB_W = 1.5 * S,
      CB_H = 0.22 * S,
      CB_Y = 0.52 * S;
    const ST_W = 0.22 * S,
      ST_H = 1.15 * S,
      ST_Y = -0.08 * S;
    const RING_Y = -0.02 * S;

    const makeSolid = (
      w: number,
      h: number,
      x: number,
      y: number,
      opacity: number,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.12 * S),
        new THREE.MeshBasicMaterial({
          color: C_TEAL,
          transparent: true,
          opacity,
        }),
      );
      mesh.position.set(x, y, 0);
      return mesh;
    };

    const makeGlow = (
      w: number,
      h: number,
      x: number,
      y: number,
      opacity: number,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.22 * S),
        new THREE.MeshBasicMaterial({
          color: C_TEAL,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.position.set(x, y, 0);
      return mesh;
    };

    tetherGrp.add(makeSolid(CB_W, CB_H, 0, CB_Y, 0.88));
    tetherGrp.add(makeSolid(ST_W, ST_H, 0, ST_Y, 0.88));
    tetherGrp.add(makeGlow(CB_W * 1.15, CB_H * 2.2, 0, CB_Y, 0.09));
    tetherGrp.add(makeGlow(ST_W * 2.4, ST_H * 1.06, 0, ST_Y, 0.09));

    // Wire T silhouette
    const hw = CB_W / 2,
      hcb = CB_H / 2,
      hs = ST_W / 2;
    const sTop = CB_Y + hcb,
      sCbBot = CB_Y - hcb,
      sStemBot = ST_Y - ST_H / 2;
    const tPerim = [
      new THREE.Vector3(-hw, sTop, 0),
      new THREE.Vector3(hw, sTop, 0),
      new THREE.Vector3(hw, sCbBot, 0),
      new THREE.Vector3(hs, sCbBot, 0),
      new THREE.Vector3(hs, sStemBot, 0),
      new THREE.Vector3(-hs, sStemBot, 0),
      new THREE.Vector3(-hs, sCbBot, 0),
      new THREE.Vector3(-hw, sCbBot, 0),
    ];
    const tSegs: [THREE.Vector3, THREE.Vector3][] = tPerim.map((v, i) => [
      v,
      tPerim[(i + 1) % tPerim.length],
    ]);
    const tWireBuf = new Float32Array(tSegs.length * 6);
    tSegs.forEach(([a, b], i) => {
      tWireBuf.set([a.x, a.y, a.z], i * 6);
      tWireBuf.set([b.x, b.y, b.z], i * 6 + 3);
    });
    const tWireGeo = new THREE.BufferGeometry();
    tWireGeo.setAttribute("position", new THREE.BufferAttribute(tWireBuf, 3));
    const tetherWire = new THREE.LineSegments(
      tWireGeo,
      new THREE.LineBasicMaterial({
        color: C_TEAL,
        transparent: true,
        opacity: 0.92,
      }),
    );
    tetherGrp.add(tetherWire);

    // Elliptical Saturn ring
    const RING_RX = 0.82 * S,
      RING_RZ = 0.32 * S,
      RING_SEGS = 120;
    const buildEllipseRing = (
      rx: number,
      rz: number,
      tube: number,
      opacity: number,
      additive = false,
    ) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= RING_SEGS; i++) {
        const a = (i / RING_SEGS) * Math.PI * 2;
        pts.push(new THREE.Vector3(rx * Math.cos(a), 0, rz * Math.sin(a)));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const geo = new THREE.TubeGeometry(curve, RING_SEGS, tube, 8, true);
      const mat = new THREE.MeshBasicMaterial({
        color: C_TEAL,
        transparent: true,
        opacity,
        ...(additive
          ? { blending: THREE.AdditiveBlending, depthWrite: false }
          : {}),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = RING_Y;
      return mesh;
    };
    const saturnRing = buildEllipseRing(RING_RX, RING_RZ, 0.038 * S, 0.9);
    tetherGrp.add(saturnRing);
    tetherGrp.add(buildEllipseRing(RING_RX, RING_RZ, 0.09 * S, 0.08, true));
    tetherGrp.add(
      buildEllipseRing(RING_RX * 1.04, RING_RZ * 1.08, 0.16 * S, 0.04, true),
    );

    // Wire ellipse
    const ellLinePts: THREE.Vector3[] = [];
    for (let i = 0; i <= RING_SEGS; i++) {
      const a = (i / RING_SEGS) * Math.PI * 2;
      ellLinePts.push(
        new THREE.Vector3(RING_RX * Math.cos(a), RING_Y, RING_RZ * Math.sin(a)),
      );
    }
    tetherGrp.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ellLinePts),
        new THREE.LineBasicMaterial({
          color: C_TEAL,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );

    // Glow shells
    const glowShells = [
      { r: 0.85 * S, o: 0.07 },
      { r: 1.1 * S, o: 0.04 },
      { r: 1.45 * S, o: 0.02 },
    ];
    glowShells.forEach(({ r, o }) => {
      tetherGrp.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(r, 32, 32),
          new THREE.MeshBasicMaterial({
            color: C_TEAL,
            transparent: true,
            opacity: o,
            side: THREE.BackSide,
          }),
        ),
      );
    });

    // Core + apex
    const corePoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 * S, 16, 16),
      new THREE.MeshBasicMaterial({
        color: C_TEAL,
        transparent: true,
        opacity: 0.95,
      }),
    );
    tetherGrp.add(corePoint);

    const warmHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.18 * S, 16, 16),
      new THREE.MeshBasicMaterial({
        color: C_WARM,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    tetherGrp.add(warmHalo);

    const apexGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12 * S),
      new THREE.MeshBasicMaterial({
        color: C_TEAL,
        transparent: true,
        opacity: 0.6,
        wireframe: true,
      }),
    );
    apexGem.position.y = CB_Y + CB_H / 2 + 0.08 * S;
    tetherGrp.add(apexGem);

    // Pulse rings
    const pulseRings = Array.from({ length: 3 }, (_, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.22 * S, 0.008 * S, 8, 48),
        new THREE.MeshBasicMaterial({
          color: C_TEAL,
          transparent: true,
          opacity: 0,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = RING_Y;
      tetherGrp.add(ring);
      return ring;
    });

    // Orbit rings
    const rings = [
      new THREE.TorusGeometry(1.85 * S, 0.01 * S, 8, 64),
      new THREE.TorusGeometry(2.6 * S, 0.007 * S, 8, 64),
      new THREE.TorusGeometry(3.5 * S, 0.006 * S, 8, 64),
    ].map((geo, i) => {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: C_TEAL,
          transparent: true,
          opacity: [0.22, 0.14, 0.09][i],
        }),
      );
      const tilts = [Math.PI / 2.6, Math.PI / 3.4, Math.PI / 4.2];
      m.rotation.x = tilts[i];
      scene.add(m);
      return m;
    });

    // Token nodes
    const tokenMeshes = TOKENS.map((td) => {
      const node = new THREE.Group();
      const glowGeo = new THREE.SphereGeometry(0.18, 16, 16);
      node.add(
        new THREE.Mesh(
          glowGeo,
          new THREE.MeshBasicMaterial({
            color: C_TEAL,
            transparent: true,
            opacity: 0.55,
          }),
        ),
      );
      const glowGeo2 = new THREE.SphereGeometry(0.28, 16, 16);
      node.add(
        new THREE.Mesh(
          glowGeo2,
          new THREE.MeshBasicMaterial({
            color: C_TEAL,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide,
          }),
        ),
      );
      scene.add(node);
      return { mesh: node, ...td };
    });

    const connBuf = new Float32Array(TOKENS.length * TOKENS.length * 6);
    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute("position", new THREE.BufferAttribute(connBuf, 3));
    scene.add(
      new THREE.LineSegments(
        connGeo,
        new THREE.LineBasicMaterial({
          color: C_TEAL,
          transparent: true,
          opacity: 0.18,
        }),
      ),
    );

    // Particles
    const PC = 1100;
    const pPos = new Float32Array(PC * 3);
    for (let i = 0; i < PC; i++) {
      const arm = Math.floor(Math.random() * 3);
      const aA = (arm / 3) * Math.PI * 2;
      const r = 0.8 + Math.random() ** 1.3 * 4.2;
      const th = aA + r * 0.45 + Math.random() * 1.0;
      const tX = Math.PI / 5.5;
      const x = r * Math.cos(th);
      const yR = r * Math.sin(th);
      pPos[i * 3] = x;
      pPos[i * 3 + 1] = yR * Math.cos(tX) + (Math.random() - 0.5) * 0.3;
      pPos[i * 3 + 2] = yR * Math.sin(tX) + (Math.random() - 0.5) * 0.3;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const particleSystem = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: C_TEAL,
        size: 0.022,
        transparent: true,
        opacity: 0.44,
        sizeAttenuation: true,
      }),
    );
    scene.add(particleSystem);

    // Depth bars + grid
    const BAR = 36,
      barM: THREE.Mesh[] = [],
      barH: number[] = [],
      barT: number[] = [];
    for (let i = 0; i < BAR; i++) {
      const isBid = i >= BAR / 2;
      const h0 = 0.1 + Math.random() * 0.9;
      barH.push(h0);
      barT.push(h0);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.095, 1.0, 0.05),
        new THREE.MeshBasicMaterial({
          color: isBid ? C_TEAL : C_TEAL_MID,
          transparent: true,
          opacity: isBid ? 0.3 : 0.18,
        }),
      );
      bar.position.set((i - BAR / 2) * 0.12, -3.2 + 0.5, -0.8);
      bar.scale.y = h0;
      scene.add(bar);
      barM.push(bar);
    }
    const gridHelper = new THREE.GridHelper(10, 16, C_TEAL_DARK, C_TEAL_DARK);
    gridHelper.position.y = -3.2;
    gridHelper.position.z = -0.8;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.28;
    scene.add(gridHelper);

    // Flow particles
    const FLOW = 90;
    const flowPos = new Float32Array(FLOW * 3);
    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute("position", new THREE.BufferAttribute(flowPos, 3));
    scene.add(
      new THREE.Points(
        fGeo,
        new THREE.PointsMaterial({
          color: C_TEAL,
          size: 0.055,
          transparent: true,
          opacity: 0.75,
          sizeAttenuation: true,
        }),
      ),
    );
    const flowState = Array.from({ length: FLOW }, () => ({
      a: Math.floor(Math.random() * TOKENS.length),
      b: Math.floor(Math.random() * TOKENS.length),
      t: Math.random(),
      speed: 0.55 + Math.random() * 0.9,
    }));

    // ── Animation loop ────────────────────────────────────────────
    const clock = new THREE.Clock();
    let camX = 0,
      camY = 0,
      rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      tetherGrp.rotation.y = t * 0.22 + mx * 0.08;
      tetherGrp.rotation.x = Math.sin(t * 0.18) * 0.18 + -my * 0.08;
      tetherGrp.rotation.z = Math.sin(t * 0.11) * 0.06;

      corePoint.scale.setScalar(1 + Math.sin(t * 2.6) * 0.22);
      warmHalo.scale.setScalar(1 + Math.sin(t * 1.5) * 0.32);
      apexGem.scale.setScalar(1 + Math.sin(t * 3.2) * 0.18);
      (tetherWire.material as THREE.LineBasicMaterial).opacity =
        0.68 + 0.24 * Math.sin(t * 0.95);
      (saturnRing.material as THREE.MeshBasicMaterial).opacity =
        0.78 + 0.18 * Math.sin(t * 1.1 + 0.5);

      pulseRings.forEach((ring, i) => {
        const phase = (t * 0.28 + i * 0.2) % 1;
        ring.scale.setScalar(0.5 + phase * 7.0);
        (ring.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.28;
      });

      rings[0].rotation.z = t * 0.13;
      rings[1].rotation.z = -t * 0.085;
      rings[2].rotation.z = t * 0.055;

      tokenMeshes.forEach((tn) => {
        const a = t * tn.speed + tn.phase;
        const x = tn.r * Math.cos(a);
        const yR = tn.r * Math.sin(a);
        const y = yR * Math.cos(tn.tiltX);
        const z = yR * Math.sin(tn.tiltX);
        const cZ = Math.cos(tn.tiltZ),
          sZ = Math.sin(tn.tiltZ);
        tn.mesh.position.set(x * cZ - y * sZ, x * sZ + y * cZ, z);
        tn.mesh.rotation.y = t * 0.5;
      });

      let li = 0;
      const lp = connGeo.attributes.position as THREE.BufferAttribute;
      for (let a = 0; a < tokenMeshes.length; a++)
        for (let b = a + 1; b < tokenMeshes.length; b++) {
          const pa = tokenMeshes[a].mesh.position;
          const pb = tokenMeshes[b].mesh.position;
          if (pa.distanceTo(pb) < 3.8) {
            lp.array[li++] = pa.x;
            lp.array[li++] = pa.y;
            lp.array[li++] = pa.z;
            lp.array[li++] = pb.x;
            lp.array[li++] = pb.y;
            lp.array[li++] = pb.z;
          }
        }
      lp.needsUpdate = true;
      connGeo.setDrawRange(0, li / 3);

      const fp = fGeo.attributes.position as THREE.BufferAttribute;
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
        const e = fs.t;
        fp.array[i * 3] = pa.x + (pb.x - pa.x) * e;
        fp.array[i * 3 + 1] =
          pa.y + (pb.y - pa.y) * e + Math.sin(e * Math.PI) * 0.5;
        fp.array[i * 3 + 2] = pa.z + (pb.z - pa.z) * e;
      });
      fp.needsUpdate = true;

      particleSystem.rotation.y = t * 0.05;
      particleSystem.rotation.z = t * 0.017;

      if (Math.random() < 0.07) {
        const idx = Math.floor(Math.random() * BAR);
        barT[idx] = 0.08 + Math.random() ** 1.5;
      }
      barM.forEach((bar, i) => {
        barH[i] += (barT[i] - barH[i]) * 0.07;
        bar.scale.y = barH[i];
        bar.position.y = -3.2 + barH[i] * 0.5;
      });
      (gridHelper.material as THREE.Material).opacity =
        0.14 + 0.09 * Math.sin(t * 0.75);

      camX += (mx * 0.65 - camX) * 0.032;
      camY += (-my * 0.38 - camY) * 0.032;
      camera.position.x = camX;
      camera.position.y = 0.3 + camY;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, [isDark]);

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
