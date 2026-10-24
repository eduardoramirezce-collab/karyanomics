"use client";

/**
 * Decorative three.js DNA double helix. Loaded only on the client
 * (next/dynamic, ssr:false) and always aria-hidden.
 *
 * Performance rules:
 * - devicePixelRatio capped at 2; half the spheres under 768px;
 * - the render loop pauses off-screen (IntersectionObserver) and in hidden tabs;
 * - reduced motion renders a single static frame (no loop, no parallax, no pulse);
 * - geometry, materials and the renderer are disposed on unmount.
 */
import { useEffect, useRef } from "react";
import {
  Color,
  CylinderGeometry,
  DirectionalLight,
  DynamicDrawUsage,
  Euler,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";

export type HelixVariant = "hero" | "compact";

export interface HelixProps {
  variant: HelixVariant;
  reducedMotion: boolean;
  /** Scroll progress 0–1 written by GSAP ScrollTrigger; read every frame. */
  motion?: { current: { progress: number } };
  /** Called when WebGL can't start, so the stage can show the logo instead. */
  onFallback: () => void;
}

const PRESETS = {
  hero: {
    rungs: 44, radius: 2.15, rise: 0.46, twist: 0.36, tilt: 0.38, speed: 0.22, z: 25, zoom: 8,
    fog: "#F7F8FC", fogNear: 20, fogFar: 36, from: "#1B1F4B", to: "#6AAEFF", pulseEvery: 2.6,
    sphere: 0.27, segments: [20, 14] as const,
  },
  compact: {
    rungs: 30, radius: 1.9, rise: 0.44, twist: 0.36, tilt: 0.3, speed: 0.09, z: 22, zoom: 0,
    fog: "#1B1F4B", fogNear: 17, fogFar: 32, from: "#2D50A0", to: "#6AAEFF", pulseEvery: 3.4,
    sphere: 0.24, segments: [16, 12] as const,
  },
};

const PULSE_SECONDS = 1.3;

export default function Helix({ variant, reducedMotion, motion, onFallback }: HelixProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const preset = PRESETS[variant];
    const small = window.innerWidth < 768;
    const rungs = small ? Math.round(preset.rungs / 2) : preset.rungs;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onFallback();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    host.appendChild(canvas);

    const scene = new Scene();
    scene.fog = new Fog(preset.fog, preset.fogNear, preset.fogFar);
    const camera = new PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, preset.z);

    scene.add(new HemisphereLight(0xffffff, 0x1b1f4b, 1.25));
    const key = new DirectionalLight(0xffffff, 2.1);
    key.position.set(4, 6, 9);
    scene.add(key);

    const tilt = new Group();
    tilt.rotation.z = preset.tilt;
    const spin = new Group();
    tilt.add(spin);
    scene.add(tilt);

    const height = (rungs - 1) * preset.rise;
    const y0 = -height / 2;
    const from = new Color(preset.from);
    const to = new Color(preset.to);
    const pulseColor = new Color("#8EC2FF");
    const tmpColor = new Color();
    const matrix = new Matrix4();
    const quat = new Quaternion();
    const scale = new Vector3();

    // Two strands of instanced spheres: two spheres per rung on each strand.
    const perStrand = rungs * 2 - 1;
    const sphereGeometry = new SphereGeometry(preset.sphere, preset.segments[0], preset.segments[1]);
    const sphereMaterial = new MeshStandardMaterial({ roughness: 0.32, metalness: 0.06 });
    const spheres = new InstancedMesh(sphereGeometry, sphereMaterial, perStrand * 2);
    spheres.instanceMatrix.setUsage(DynamicDrawUsage);
    const sphereBase: { pos: Vector3; scale: number; color: Color }[] = [];
    for (let strand = 0; strand < 2; strand += 1) {
      for (let k = 0; k < perStrand; k += 1) {
        const t = k / 2;
        const angle = t * preset.twist + strand * Math.PI;
        const base = {
          pos: new Vector3(Math.cos(angle) * preset.radius, y0 + t * preset.rise, Math.sin(angle) * preset.radius),
          scale: k % 2 === 0 ? 1 : 0.62,
          color: new Color().copy(from).lerp(to, t / (rungs - 1)),
        };
        sphereBase.push(base);
        const index = strand * perStrand + k;
        spheres.setMatrixAt(index, matrix.compose(base.pos, quat.identity(), scale.setScalar(base.scale)));
        spheres.setColorAt(index, base.color);
      }
    }
    spin.add(spheres);

    // Rungs: thin cylinders across the helix axis, one per base pair.
    const rungGeometry = new CylinderGeometry(0.065, 0.065, preset.radius * 2, 10, 1);
    const rungMaterial = new MeshStandardMaterial({ roughness: 0.5, metalness: 0 });
    const rungMesh = new InstancedMesh(rungGeometry, rungMaterial, rungs);
    rungMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    const rungBase: { pos: Vector3; quat: Quaternion; color: Color }[] = [];
    for (let i = 0; i < rungs; i += 1) {
      const angle = i * preset.twist;
      const base = {
        pos: new Vector3(0, y0 + i * preset.rise, 0),
        quat: new Quaternion().setFromEuler(new Euler(0, -angle, -Math.PI / 2, "YXZ")),
        color: new Color().copy(from).lerp(to, i / (rungs - 1)).lerp(new Color("#ffffff"), 0.18),
      };
      rungBase.push(base);
      rungMesh.setMatrixAt(i, matrix.compose(base.pos, base.quat, scale.set(1, 1, 1)));
      rungMesh.setColorAt(i, base.color);
    }
    spin.add(rungMesh);

    const markDirty = () => {
      spheres.instanceMatrix.needsUpdate = true;
      rungMesh.instanceMatrix.needsUpdate = true;
      if (spheres.instanceColor) spheres.instanceColor.needsUpdate = true;
      if (rungMesh.instanceColor) rungMesh.instanceColor.needsUpdate = true;
    };

    // "Reading a variant": one rung (and its two bases) glows sky blue.
    function applyPulse(rung: number, amount: number) {
      const r = rungBase[rung];
      const swell = 1 + 0.9 * amount;
      rungMesh.setMatrixAt(rung, matrix.compose(r.pos, r.quat, scale.set(swell, 1, swell)));
      rungMesh.setColorAt(rung, tmpColor.copy(r.color).lerp(pulseColor, amount));
      for (const index of [rung * 2, perStrand + rung * 2]) {
        const s = sphereBase[index];
        spheres.setMatrixAt(index, matrix.compose(s.pos, quat.identity(), scale.setScalar(s.scale * (1 + 0.45 * amount))));
        spheres.setColorAt(index, tmpColor.copy(s.color).lerp(pulseColor, amount));
      }
      markDirty();
    }

    const resize = () => {
      const width = host.clientWidth;
      const heightPx = host.clientHeight;
      if (!width || !heightPx) return;
      renderer.setSize(width, heightPx, false);
      camera.aspect = width / heightPx;
      camera.updateProjectionMatrix();
      if (reducedMotion) renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    if (reducedMotion) {
      spin.rotation.y = 0.6;
      renderer.render(scene, camera);
      return () => {
        resizeObserver.disconnect();
        dispose();
      };
    }

    const pointer = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let onScreen = true;
    let pageVisible = !document.hidden;
    let nextPulse = 1.2;
    let pulse: { rung: number; start: number } | null = null;
    const low = Math.floor(rungs * 0.2);
    const span = Math.max(1, Math.floor(rungs * 0.6));

    function frame(now: number) {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      const progress = motion?.current.progress ?? 0;
      spin.rotation.y += dt * preset.speed * (1 + 3.5 * progress);
      const targetZ = preset.z - preset.zoom * progress;
      camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 6);
      const ease = Math.min(1, dt * 2.5);
      tilt.rotation.x += (pointer.y * 0.14 - tilt.rotation.x) * ease;
      tilt.rotation.y += (pointer.x * 0.22 - tilt.rotation.y) * ease;

      if (!pulse && elapsed >= nextPulse) {
        pulse = { rung: low + Math.floor(Math.random() * span), start: elapsed };
      }
      if (pulse) {
        const k = (elapsed - pulse.start) / PULSE_SECONDS;
        if (k >= 1) {
          applyPulse(pulse.rung, 0);
          pulse = null;
          nextPulse = elapsed + preset.pulseEvery;
        } else {
          applyPulse(pulse.rung, Math.sin(k * Math.PI));
        }
      }
      renderer.render(scene, camera);
      schedule();
    }

    function schedule() {
      if (!raf && onScreen && pageVisible) raf = requestAnimationFrame(frame);
    }
    function pause() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) {
        last = performance.now();
        schedule();
      } else {
        pause();
      }
    });
    intersection.observe(host);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) {
        last = performance.now();
        schedule();
      } else {
        pause();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      pause();
      onScreen = false;
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    schedule();

    function dispose() {
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      rungGeometry.dispose();
      rungMaterial.dispose();
      spheres.dispose();
      rungMesh.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    }

    return () => {
      pause();
      intersection.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      dispose();
    };
  }, [variant, reducedMotion, motion, onFallback]);

  return <div ref={hostRef} aria-hidden="true" className="h-full w-full" />;
}
