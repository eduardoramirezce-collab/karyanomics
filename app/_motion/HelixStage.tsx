"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useReducedMotion, useWebGLSupport } from "./env";
import type { HelixVariant } from "./Helix";

// three.js is loaded only in the browser, after the page's HTML and text are in place.
const Helix = dynamic(() => import("./Helix"), { ssr: false, loading: () => null });

interface HelixStageProps {
  variant?: HelixVariant;
  motion?: { current: { progress: number } };
  className?: string;
}

/** Sized box for the helix. Falls back to the logo mark when WebGL is unavailable. */
export default function HelixStage({ variant = "hero", motion, className = "" }: HelixStageProps) {
  const webgl = useWebGLSupport();
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const onFallback = useCallback(() => setFailed(true), []);

  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`}>
      {webgl === false || failed ? (
        <div className="flex h-full w-full items-center justify-center">
          <Image src="/brand/karyanomics-mark.png" alt="" width={240} height={192} className="h-auto w-40 opacity-90 sm:w-56" />
        </div>
      ) : webgl ? (
        <Helix variant={variant} reducedMotion={reducedMotion} motion={motion} onFallback={onFallback} />
      ) : null}
    </div>
  );
}
