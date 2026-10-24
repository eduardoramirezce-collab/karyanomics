"use client";

import Image from "next/image";
import { useMediaQuery } from "../_motion/env";
import HelixStage from "../_motion/HelixStage";

/** Navy brand panel. The slow helix loads only on wide screens; phones get the static mark. */
export default function LoginAside() {
  const wide = useMediaQuery("(min-width: 1024px)");
  return (
    <aside className="on-ink relative isolate flex flex-col justify-between gap-6 overflow-hidden bg-ink p-6 text-white sm:p-8 lg:sticky lg:top-0 lg:h-[calc(100svh-4.25rem)] lg:p-12">
      <span aria-hidden="true" className="absolute -left-24 -top-24 -z-20 h-80 w-80 rounded-full bg-royal/60 blur-3xl" />
      {wide ? (
        <>
          <HelixStage variant="compact" className="absolute inset-x-0 top-0 bottom-[22%] -z-20" />
          {/* Scrim keeps the caption at full contrast over the helix. */}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[55%] bg-gradient-to-t from-ink from-45% via-ink/85 to-transparent" />
        </>
      ) : (
        <Image src="/brand/karyanomics-mark.png" alt="" width={240} height={192} aria-hidden="true" className="h-12 w-auto brightness-0 invert" />
      )}
      <div className="flex flex-col gap-3 lg:mt-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky">Demo sign-in</p>
        <p className="display max-w-md text-4xl sm:text-5xl lg:text-6xl">Your results, read on this device.</p>
        <p className="max-w-sm text-base text-white/85">Pick a demo account or load your own file. Nothing is sent to a server.</p>
      </div>
    </aside>
  );
}
