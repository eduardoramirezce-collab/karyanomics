"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK, useGSAP } from "./gsap";

/**
 * Fades and lifts every [data-reveal] child into place when the block scrolls
 * into view. Content is server-rendered and fully visible without JS or with
 * reduced motion; only opacity and transform are animated.
 */
export default function Reveal({ children, className = "", stagger = 0.08 }: { children: ReactNode; className?: string; stagger?: number }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.from("[data-reveal]", {
        opacity: 0,
        y: 32,
        duration: 0.9,
        ease: "power3.out",
        stagger,
        scrollTrigger: { trigger: root.current, start: "top 82%", once: true },
      });
    });
    return () => mm.revert();
  }, { scope: root });
  return <div ref={root} className={className}>{children}</div>;
}
