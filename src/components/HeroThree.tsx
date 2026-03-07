import { useEffect, useRef } from "react";

const A = { r: 151 / 255, g: 252 / 255, b: 228 / 255 };

export const HeroThree = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let animId: number;
    const cleanups: (() => void)[] = [];

    const init = async () => {
      const THREE = await import("three");

      const W = mount.clientWidth;
      const H = mount.clientHeight;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
      camera.position.set(0, 0, 7.0);

      const ACCENT = new THREE.Color(A.r, A.g, A.b);
      const DARK = new THREE.Color(0.01, 0.022, 0.016);

      let mx = 0,
        my = 0;
      const onMouse = (e: MouseEvent) => {
        const r = mount.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      window.addEventListener("mousemove", onMouse);

      const tmpV = new THREE.Vector3();
      const tmpPA = new THREE.Vector3();
      const tmpPB = new THREE.Vector3();

      // ══════════════════════════════════════════════════════════
      // HEX BACKDROP
      // ══════════════════════════════════════════════════════════
      const hexGrp = new THREE.Group();
      const hexMat = new THREE.LineBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.03,
        depthWrite: false,
      });
      const HS = 0.44;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 15; col++) {
          const hx = col * HS * 1.732 + (row % 2) * HS * 0.866;
          const hy = row * HS * 1.5;
          const pts: THREE.Vector3[] = [];
          for (let a = 0; a <= 6; a++) {
            const ang = (a * Math.PI) / 3;
            pts.push(
              new THREE.Vector3(
                hx + HS * Math.cos(ang),
                hy + HS * Math.sin(ang),
                0,
              ),
            );
          }
          hexGrp.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(pts),
              hexMat,
            ),
          );
        }
      }
      hexGrp.position.set(-6, -4.5, -3.5);
      scene.add(hexGrp);

      // ══════════════════════════════════════════════════════════
      // CENTRAL SPHERE
      // ══════════════════════════════════════════════════════════
      const sphereGrp = new THREE.Group();
      scene.add(sphereGrp);

      // Dark backface fill
      sphereGrp.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.28, 36, 36),
          new THREE.MeshBasicMaterial({
            color: DARK,
            transparent: true,
            opacity: 0.97,
            side: THREE.BackSide,
          }),
        ),
      );

      // Icosahedron wireframe
      const sphereWire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.28, 2),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          wireframe: true,
          transparent: true,
          opacity: 0.22,
        }),
      );
      sphereGrp.add(sphereWire);

      // Inner lattice
      const innerLattice = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.94, 3),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          wireframe: true,
          transparent: true,
          opacity: 0.07,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sphereGrp.add(innerLattice);

      // Equatorial bright ring
      sphereGrp.add(
        new THREE.Mesh(
          new THREE.TorusGeometry(1.35, 0.004, 2, 160),
          new THREE.MeshBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.55,
          }),
        ),
      );

      // Tilted ring
      const tiltRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, 0.003, 2, 160),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          transparent: true,
          opacity: 0.22,
        }),
      );
      tiltRing.rotation.x = Math.PI * 0.35;
      tiltRing.rotation.z = Math.PI * 0.15;
      sphereGrp.add(tiltRing);

      // Atmosphere layers
      sphereGrp.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.56, 24, 24),
          new THREE.MeshBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.018,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      sphereGrp.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.88, 16, 16),
          new THREE.MeshBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.007,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );

      // Hot core
      const corePoint = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.92,
        }),
      );
      sphereGrp.add(corePoint);
      sphereGrp.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 12, 12),
          new THREE.MeshBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.14,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide,
          }),
        ),
      );

      // ══════════════════════════════════════════════════════════
      // ORBITAL RINGS
      // ══════════════════════════════════════════════════════════
      const RING_DEFS = [
        {
          rx: Math.PI / 2,
          ry: 0,
          rz: 0,
          R: 1.88,
          N: 8,
          spd: 0.0035,
          label: "L1",
        },
        {
          rx: Math.PI * 0.34,
          ry: Math.PI / 4,
          rz: 0,
          R: 1.72,
          N: 7,
          spd: -0.0028,
          label: "L2",
        },
        {
          rx: Math.PI * 0.14,
          ry: Math.PI * 0.7,
          rz: Math.PI / 5,
          R: 2.08,
          N: 9,
          spd: 0.0022,
          label: "DeFi",
        },
      ];

      const ringGroups: THREE.Group[] = [];
      const ringEulers = RING_DEFS.map(
        (d) => new THREE.Euler(d.rx, d.ry, d.rz),
      );

      const nodeGeo = new THREE.SphereGeometry(0.038, 8, 8);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.95,
      });
      const haloGeo = new THREE.SphereGeometry(0.09, 8, 8);
      const haloMat = new THREE.MeshBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      RING_DEFS.forEach((def, ri) => {
        const grp = new THREE.Group();
        grp.rotation.copy(ringEulers[ri]);
        grp.add(
          new THREE.Mesh(
            new THREE.TorusGeometry(def.R, 0.003, 2, 128),
            new THREE.MeshBasicMaterial({
              color: ACCENT,
              transparent: true,
              opacity: 0.2,
            }),
          ),
        );
        for (let tk = 0; tk < 60; tk++) {
          const isMaj = tk % 15 === 0;
          const ang = (tk / 60) * Math.PI * 2;
          const len = isMaj ? 0.072 : 0.02;
          grp.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(
                  Math.cos(ang) * (def.R - len),
                  Math.sin(ang) * (def.R - len),
                  0,
                ),
                new THREE.Vector3(
                  Math.cos(ang) * (def.R + len),
                  Math.sin(ang) * (def.R + len),
                  0,
                ),
              ]),
              new THREE.LineBasicMaterial({
                color: ACCENT,
                transparent: true,
                opacity: isMaj ? 0.3 : 0.06,
              }),
            ),
          );
        }
        for (let n = 0; n < def.N; n++) {
          const ang = (n / def.N) * Math.PI * 2;
          const nx = Math.cos(ang) * def.R;
          const ny = Math.sin(ang) * def.R;
          const node = new THREE.Mesh(nodeGeo, nodeMat);
          node.position.set(nx, ny, 0);
          grp.add(node);
          const halo = new THREE.Mesh(haloGeo, haloMat);
          halo.position.set(nx, ny, 0);
          grp.add(halo);
        }
        scene.add(grp);
        ringGroups.push(grp);
      });

      // ══════════════════════════════════════════════════════════
      // ② CRYSTAL — clean icosahedron orbiting the sphere
      //   Replaces the torus knot. Sharp, geometric, elegant.
      // ══════════════════════════════════════════════════════════
      const ORBIT_R = 2.55;
      const ORBIT_SPEED = 0.16;
      const ORBIT_TILT = 0.42;

      const crystalGrp = new THREE.Group();
      scene.add(crystalGrp);

      // Dark backface — gives the crystal solid depth
      crystalGrp.add(
        new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.5, 1),
          new THREE.MeshBasicMaterial({
            color: DARK,
            transparent: true,
            opacity: 0.96,
            side: THREE.BackSide,
          }),
        ),
      );

      // Primary wireframe — crisp faceted crystal surface
      const crystalWire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 1),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          wireframe: true,
          transparent: true,
          opacity: 0.34,
        }),
      );
      crystalGrp.add(crystalWire);

      // Inner crystal — smaller, rotates independently for depth
      const crystalInner = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.28, 0),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          wireframe: true,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      crystalGrp.add(crystalInner);

      // Equatorial ring — anchors the crystal visually
      const crystalRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.004, 2, 80),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          transparent: true,
          opacity: 0.5,
        }),
      );
      crystalGrp.add(crystalRing);

      // Second tilted accent ring
      const crystalRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.003, 2, 80),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          transparent: true,
          opacity: 0.2,
        }),
      );
      crystalRing2.rotation.x = Math.PI * 0.38;
      crystalRing2.rotation.z = Math.PI * 0.12;
      crystalGrp.add(crystalRing2);

      // Atmosphere glow
      crystalGrp.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.38, 12, 12),
          new THREE.MeshBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.04,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide,
          }),
        ),
      );

      // Bright inner core — pulses
      const crystalCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.85,
        }),
      );
      crystalGrp.add(crystalCore);

      // ── Orbital trail ─────────────────────────────────────────
      const TRAIL = 42;
      const trailGeo = new THREE.BufferGeometry();
      const trailPos = new Float32Array(TRAIL * 3);
      trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
      trailGeo.setDrawRange(0, TRAIL);
      scene.add(
        new THREE.Points(
          trailGeo,
          new THREE.PointsMaterial({
            color: ACCENT,
            size: 0.032,
            transparent: true,
            opacity: 0.45,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      const trailAttr = trailGeo.attributes.position as THREE.BufferAttribute;
      const trailHist = Array.from(
        { length: TRAIL },
        () => new THREE.Vector3(),
      );
      let trailHead = 0;

      // ══════════════════════════════════════════════════════════
      // ARC PARTICLES — flow along orbital rings
      // ══════════════════════════════════════════════════════════
      const ARC = 65;
      const arcData = Array.from({ length: ARC }, () => ({
        ri: Math.floor(Math.random() * 3),
        ang: Math.random() * Math.PI * 2,
        spd: (0.55 + Math.random() * 0.95) * (Math.random() > 0.5 ? 1 : -1),
      }));
      const arcBuf = new Float32Array(ARC * 3);
      const arcGeo = new THREE.BufferGeometry();
      arcGeo.setAttribute("position", new THREE.BufferAttribute(arcBuf, 3));
      scene.add(
        new THREE.Points(
          arcGeo,
          new THREE.PointsMaterial({
            color: ACCENT,
            size: 0.046,
            transparent: true,
            opacity: 0.88,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      const arcAttr = arcGeo.attributes.position as THREE.BufferAttribute;

      // ══════════════════════════════════════════════════════════
      // BACKGROUND ORBITAL CLOUD + CONNECTIONS
      // ══════════════════════════════════════════════════════════
      const P = 160;
      const bgPh = Float32Array.from(
        { length: P },
        () => Math.random() * Math.PI * 2,
      );
      const bgR = Float32Array.from(
        { length: P },
        () => 2.7 + Math.random() * 1.2,
      );
      const bgSpd = Float32Array.from(
        { length: P },
        () => (0.1 + Math.random() * 0.2) * (Math.random() > 0.5 ? 1 : -1),
      );
      const bgAx = Array.from({ length: P }, () => {
        const θ = Math.random() * Math.PI * 2;
        const φ = Math.acos(2 * Math.random() - 1);
        return new THREE.Vector3(
          Math.sin(φ) * Math.cos(θ),
          Math.sin(φ) * Math.sin(θ),
          Math.cos(φ),
        ).normalize();
      });
      const bgBuf = new Float32Array(P * 3);
      const bgGeo = new THREE.BufferGeometry();
      bgGeo.setAttribute("position", new THREE.BufferAttribute(bgBuf, 3));
      scene.add(
        new THREE.Points(
          bgGeo,
          new THREE.PointsMaterial({
            color: ACCENT,
            size: 0.015,
            transparent: true,
            opacity: 0.38,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      const bgAttr = bgGeo.attributes.position as THREE.BufferAttribute;

      const MAX_L = 80;
      const lBuf = new Float32Array(MAX_L * 6);
      const lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute("position", new THREE.BufferAttribute(lBuf, 3));
      lGeo.setDrawRange(0, 0);
      scene.add(
        new THREE.LineSegments(
          lGeo,
          new THREE.LineBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.06,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      const lAttr = lGeo.attributes.position as THREE.BufferAttribute;

      // ══════════════════════════════════════════════════════════
      // SCAN PLANE
      // ══════════════════════════════════════════════════════════
      const scanMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 7),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          transparent: true,
          opacity: 0.008,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      scene.add(scanMesh);
      const scanEdge = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 0.005),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      scene.add(scanEdge);

      // ══════════════════════════════════════════════════════════
      // DEPTH BARS + PULSE RINGS
      // ══════════════════════════════════════════════════════════
      const D = 60;
      const depthH = Float32Array.from(
        { length: D },
        () => 0.06 + Math.random() * 0.36,
      );
      const depthMeshes: THREE.Mesh[] = [];
      const depthGrp = new THREE.Group();
      for (let i = 0; i < D; i++) {
        const ang = (i / D) * Math.PI * 2;
        const dMat = new THREE.MeshBasicMaterial({
          color: ACCENT,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 1), dMat);
        bar.position.set(Math.cos(ang) * 2.9, 0, Math.sin(ang) * 2.9);
        bar.lookAt(new THREE.Vector3(0, 0, 0));
        depthGrp.add(bar);
        depthMeshes.push(bar);
      }
      scene.add(depthGrp);

      const pulseRings = Array.from({ length: 5 }, () => {
        const m = new THREE.Mesh(
          new THREE.TorusGeometry(0.5, 0.003, 2, 80),
          new THREE.MeshBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        m.rotation.x = Math.PI / 2;
        scene.add(m);
        return m;
      });

      // ── Resize ────────────────────────────────────────────────
      const onResize = () => {
        const w = mount.clientWidth,
          h = mount.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      // ══════════════════════════════════════════════════════════
      // ANIMATE LOOP
      // ══════════════════════════════════════════════════════════
      let cRX = 0,
        cRY = 0;
      const clock = new THREE.Clock();

      const animate = () => {
        animId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        const tRX = -my * 0.25,
          tRY = mx * 0.25;
        cRX += (tRX - cRX) * 0.04;
        cRY += (tRY - cRY) * 0.04;

        // ── Sphere ──────────────────────────────────────────────
        sphereWire.rotation.x = cRX + t * 0.06;
        sphereWire.rotation.y = cRY + t * 0.08;
        innerLattice.rotation.x = cRX * 0.6 - t * 0.11;
        innerLattice.rotation.y = cRY * 0.6 + t * 0.09;
        sphereGrp.rotation.x = cRX * 0.15;
        sphereGrp.rotation.y = cRY * 0.15;
        const pulse = 1 + Math.sin(t * 2.8) * 0.14;
        corePoint.scale.setScalar(pulse);

        hexGrp.rotation.z = t * 0.003;
        depthGrp.rotation.y = t * 0.016;

        // ── Orbital rings ────────────────────────────────────────
        RING_DEFS.forEach((def, ri) => {
          ringGroups[ri].rotation.z += def.spd;
        });

        // ── Crystal orbit ────────────────────────────────────────
        const orbitAngle = t * ORBIT_SPEED;
        const kx = Math.cos(orbitAngle) * ORBIT_R;
        const kz = Math.sin(orbitAngle) * ORBIT_R;
        const ky =
          Math.sin(orbitAngle * 2) * ORBIT_R * Math.sin(ORBIT_TILT) * 0.38;
        crystalGrp.position.set(kx, ky, kz);

        // Crystal self-rotation — axes at different speeds for variety
        crystalWire.rotation.x = t * 0.14 + cRX * 0.3;
        crystalWire.rotation.y = t * 0.09 - cRY * 0.3;
        crystalWire.rotation.z = t * 0.06;

        // Inner crystal counter-rotates for parallax depth
        crystalInner.rotation.x = -t * 0.19;
        crystalInner.rotation.y = t * 0.14;
        crystalInner.rotation.z = -t * 0.08;

        // Rings track the crystal's main rotation
        crystalRing.rotation.x = crystalWire.rotation.x * 0.6;
        crystalRing.rotation.y = crystalWire.rotation.y * 0.6;
        crystalRing2.rotation.x = Math.PI * 0.38 + crystalWire.rotation.x * 0.4;
        crystalRing2.rotation.y = crystalWire.rotation.y * 0.4;

        // Crystal core pulses offset from main sphere
        const cpulse = 1 + Math.sin(t * 3.4 + 1.2) * 0.2;
        crystalCore.scale.setScalar(cpulse);

        // Whole group follows mouse gently
        crystalGrp.rotation.x = -cRX * 0.12;
        crystalGrp.rotation.y = -cRY * 0.12;

        // Trail — ring buffer of past positions
        trailHist[trailHead].set(kx, ky, kz);
        trailHead = (trailHead + 1) % TRAIL;
        for (let i = 0; i < TRAIL; i++) {
          const h = trailHist[(trailHead + i) % TRAIL];
          trailAttr.setXYZ(i, h.x, h.y, h.z);
        }
        trailAttr.needsUpdate = true;

        // ── Arc ring particles ──────────────────────────────────
        for (let i = 0; i < ARC; i++) {
          const ap = arcData[i];
          ap.ang += ap.spd * 0.016;
          const def = RING_DEFS[ap.ri];
          const ang = ap.ang + ringGroups[ap.ri].rotation.z;
          tmpV.set(Math.cos(ang) * def.R, Math.sin(ang) * def.R, 0);
          tmpV.applyEuler(ringEulers[ap.ri]);
          arcAttr.setXYZ(i, tmpV.x, tmpV.y, tmpV.z);
        }
        arcAttr.needsUpdate = true;

        // ── Background cloud ────────────────────────────────────
        for (let i = 0; i < P; i++) {
          const ang = bgPh[i] + t * bgSpd[i];
          const r = bgR[i];
          const ax = bgAx[i];
          tmpPA.set(-ax.y, ax.x, 0);
          if (tmpPA.lengthSq() < 0.001) tmpPA.set(1, 0, 0);
          tmpPA.normalize();
          tmpPB.crossVectors(ax, tmpPA).normalize();
          bgAttr.setXYZ(
            i,
            tmpPA.x * Math.cos(ang) * r + tmpPB.x * Math.sin(ang) * r,
            tmpPA.y * Math.cos(ang) * r + tmpPB.y * Math.sin(ang) * r,
            tmpPA.z * Math.cos(ang) * r + tmpPB.z * Math.sin(ang) * r,
          );
        }
        bgAttr.needsUpdate = true;

        let lc = 0;
        for (let i = 0; i < P && lc < MAX_L; i++) {
          const ax = bgAttr.getX(i),
            ay = bgAttr.getY(i),
            az = bgAttr.getZ(i);
          for (let j = i + 1; j < P && lc < MAX_L; j++) {
            if (
              Math.hypot(
                ax - bgAttr.getX(j),
                ay - bgAttr.getY(j),
                az - bgAttr.getZ(j),
              ) < 0.65
            ) {
              lAttr.setXYZ(lc * 2, ax, ay, az);
              lAttr.setXYZ(
                lc * 2 + 1,
                bgAttr.getX(j),
                bgAttr.getY(j),
                bgAttr.getZ(j),
              );
              lc++;
            }
          }
        }
        lAttr.needsUpdate = true;
        lGeo.setDrawRange(0, lc * 2);

        // Scan plane
        const sy = Math.sin(t * 0.4) * 3.0;
        scanMesh.position.y = sy;
        scanEdge.position.y = sy;

        // Depth bars
        depthMeshes.forEach((bar, i) => {
          const h =
            depthH[i] * (0.3 + 0.7 * Math.abs(Math.sin(t * 1.05 + i * 0.33)));
          bar.scale.y = Math.max(0.01, h * 5.2);
          (bar.material as THREE.MeshBasicMaterial).opacity = 0.04 + h * 0.3;
        });

        // Pulse rings from sphere center
        pulseRings.forEach((ring, i) => {
          const phase = (t * 0.36 + i * 0.2) % 1;
          ring.scale.setScalar(0.5 + phase * 5.0);
          (ring.material as THREE.MeshBasicMaterial).opacity =
            (1 - phase) * 0.22;
        });

        renderer.render(scene, camera);
      };
      animate();

      cleanups.push(() => {
        cancelAnimationFrame(animId);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (mount.contains(renderer.domElement))
          mount.removeChild(renderer.domElement);
      });
    };

    init();
    return () => cleanups.forEach((f) => f());
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
};
