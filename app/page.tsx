import Link from "next/link";
import GeneChips from "./_landing/GeneChips";
import Hero from "./_landing/Hero";
import HowItWorks from "./_landing/HowItWorks";
import Reveal from "./_motion/Reveal";
import { eyebrow, primaryButton } from "./_portal/ui";

const PRIVACY_FACTS = ["Read on your device", "Never uploaded", "Not stored on a server"];

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <GeneChips />

      <section aria-labelledby="privacy-heading" className="on-ink relative isolate overflow-hidden bg-ink py-24 text-white lg:py-36">
        <span aria-hidden="true" className="absolute -top-40 right-[-10rem] -z-10 h-[34rem] w-[34rem] rounded-full bg-royal/50 blur-3xl" />
        <span aria-hidden="true" className="absolute bottom-[-12rem] left-[-8rem] -z-10 h-[26rem] w-[26rem] rounded-full bg-sky/20 blur-3xl" />
        <Reveal className="mx-auto w-full max-w-6xl px-5">
          <p data-reveal className="text-xs font-semibold uppercase tracking-[0.18em] text-sky">Privacy by design</p>
          <h2 id="privacy-heading" data-reveal className="display mt-4 max-w-5xl text-5xl sm:text-7xl lg:text-[7rem]">
            Your DNA never leaves your device.
          </h2>
          <p data-reveal className="mt-8 max-w-2xl text-lg leading-relaxed text-white/85">
            Your file is read and analyzed right here in your browser. Nothing is uploaded, and nothing is saved on a server.
          </p>
          <ul data-reveal className="mt-12 grid gap-3 sm:grid-cols-3">
            {PRIVACY_FACTS.map((fact) => (
              <li key={fact} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-base font-medium">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-sky">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                {fact}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section aria-labelledby="clinician-heading" className="bg-white py-20 lg:py-28">
        <Reveal className="mx-auto w-full max-w-6xl px-5">
          <div data-reveal className="relative isolate flex flex-col gap-8 overflow-hidden rounded-[2rem] border border-royal/15 bg-mist p-8 sm:p-14 lg:flex-row lg:items-end lg:justify-between">
            <span aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-sky/30 blur-3xl" />
            <div className="flex max-w-3xl flex-col gap-4">
              <p className={eyebrow}>Clinician view</p>
              <h2 id="clinician-heading" className="display text-4xl text-ink sm:text-6xl">
                For clinicians: full CPIC detail, one NPI away.
              </h2>
            </div>
            <Link href="/login?role=clinician" className={`${primaryButton} shrink-0 self-start lg:self-auto`}>
              Clinician sign in <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
