"use client";

/**
 * Single place GSAP plugins are registered. Every component imports gsap,
 * ScrollTrigger and useGSAP from here so registration happens once per client.
 * useGSAP gives automatic cleanup (context revert) on unmount.
 */
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/** Media query for "motion allowed". Every GSAP animation is gated behind it. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, useGSAP };
