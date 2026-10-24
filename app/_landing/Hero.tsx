"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "../_motion/gsap";
import HelixStage from "../_motion/HelixStage";
import { eyebrow, primaryButton, secondaryButton } from "../_portal/ui";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  // Scroll progress shared with the helix render loop (0 at top, 1 when the hero has scrolled away).
  const motion = useRef({ progress: 0 });

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const scroll = { trigger: root.current, start: "top top", end: "bottom top", scrub: true };
      gsap.to(motion.current, { progress: 1, ease: "none", scrollTrigger: scroll });
      gsap.to(".hero-copy", { yPercent: -14, opacity: 0, ease: "none", scrollTrigger: { ...scroll, end: "75% top" } });
    });
    return () => {
      mm.revert();
      motion.current.progress = 0;
    };
  }, { scope: root });

  return (
    <section ref={root} aria-labelledby="hero-heading" className="hero-glow relative isolate overflow-hidden">
      <div className="mx-auto grid min-h-[calc(100svh-4.25rem)] w-full max-w-6xl items-center gap-4 px-5 pt-10 pb-6 lg:grid-cols-[1.12fr_1fr] lg:gap-8 lg:py-0">
        <div className="hero-copy relative z-10 flex flex-col gap-7">
          <p className={`${eyebrow} inline-flex items-center gap-2`}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky shadow-[0_0_0_4px_rgba(106,174,255,0.25)]" />
            Pharmacogenomics, made personal
          </p>
          <h1 id="hero-heading" className="display text-[2.75rem] text-ink sm:text-7xl lg:text-[clamp(5.5rem,8.4vw,7.5rem)]">
            Your genes have a say in your <em className="italic text-royal">medicine.</em>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink/80 sm:text-xl">
            Upload your DNA file and see how 8 genes may affect 34 common medications. Your data never leaves your device.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={primaryButton}>
              View your results <span aria-hidden="true">→</span>
            </Link>
            <Link href="/order" className={secondaryButton}>Order your test</Link>
          </div>
        </div>
        <HelixStage motion={motion} className="relative -mx-5 h-[40svh] min-h-72 lg:mx-0 lg:h-[min(84svh,48rem)]" />
      </div>
    </section>
  );
}
