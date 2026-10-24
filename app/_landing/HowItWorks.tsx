"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "../_motion/gsap";
import { eyebrow } from "../_portal/ui";

const STEPS = [
  { title: "Order", text: "Order your test and we'll mail you a saliva kit." },
  { title: "Get notified", text: "We'll let you know when your results are ready and set up your login for the portal." },
  { title: "Check your medications", text: "Sign in and see which medications may work differently for you." },
];

/**
 * Desktop with motion: pinned horizontal scroll (GSAP adds .is-horizontal).
 * Mobile, or animations off: a plain grid / vertical stack.
 */
export default function HowItWorks() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);

  useGSAP(() => {
    const section = root.current;
    const list = track.current;
    if (!section || !list) return;
    const mm = gsap.matchMedia();
    mm.add({ wide: "(min-width: 1024px)", motion: MOTION_OK }, (context) => {
      const { wide, motion } = context.conditions as { wide: boolean; motion: boolean };
      if (!motion) return;
      if (!wide) {
        gsap.from(".step-panel", {
          opacity: 0, y: 28, duration: 0.8, ease: "power3.out", stagger: 0.12,
          scrollTrigger: { trigger: list, start: "top 85%", once: true },
        });
        return;
      }
      section.classList.add("is-horizontal");
      const distance = () => Math.max(0, list.scrollWidth - section.clientWidth);
      gsap.to(list, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      return () => section.classList.remove("is-horizontal");
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    <section ref={root} aria-labelledby="how-heading" className="relative overflow-hidden bg-white py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-5">
        <p className={eyebrow}>Three steps</p>
        <h2 id="how-heading" className="display mt-3 text-5xl text-ink sm:text-6xl lg:text-7xl">How it works</h2>
      </div>
      <ol ref={track} className="steps-track mx-auto mt-12 grid w-full max-w-6xl gap-5 px-5 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="step-panel relative flex flex-col justify-between gap-12 overflow-hidden rounded-[1.75rem] border border-ink/10 bg-paper p-7 sm:p-9">
            <span aria-hidden="true" className="absolute -right-10 -bottom-16 h-56 w-56 rounded-full bg-sky/15 blur-2xl" />
            <span className="display text-[5.5rem] leading-none text-royal sm:text-[7.5rem]">
              <span className="sr-only">Step </span>{String(index + 1).padStart(2, "0")}
            </span>
            <div className="relative flex flex-col gap-3">
              <h3 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{step.title}</h3>
              <p className="max-w-md text-base leading-relaxed text-ink/80 sm:text-lg">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
