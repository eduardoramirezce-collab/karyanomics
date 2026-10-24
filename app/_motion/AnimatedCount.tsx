"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "./gsap";

/**
 * Counts up to `value` (visual only, aria-hidden). Put the real sentence in an
 * sr-only sibling so a live region announces it once. Shows the final value
 * immediately with animations off. Reserves width so nothing shifts.
 */
export default function AnimatedCount({ value, className = "" }: { value: number; className?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const node = el.current;
    if (!node) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const counter = { n: 0 };
      node.textContent = "0";
      gsap.to(counter, {
        n: value,
        duration: 0.7,
        ease: "power2.out",
        onUpdate: () => { node.textContent = String(Math.round(counter.n)); },
      });
      return () => { node.textContent = String(value); };
    });
    return () => mm.revert();
  }, { dependencies: [value], revertOnUpdate: true });
  return (
    <span
      ref={el}
      aria-hidden="true"
      className={`inline-block text-right tabular-nums ${className}`}
      style={{ minWidth: `${String(value).length}ch` }}
    >
      {value}
    </span>
  );
}
