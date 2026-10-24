import Link from "next/link";
import { card, primaryButton, textLink } from "./_portal/ui";

const STEPS = ["Order a test", "Get your results", "Check your medications"];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-5 py-12 sm:py-16">
      <section className="flex flex-col gap-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Karyanomics</h1>
        <p className="mx-auto max-w-xl text-lg text-slate-700">
          Know how your genes shape your medications, before your next dose.
        </p>
      </section>

      <section aria-label="Get started" className="flex flex-col gap-4">
        <div className={`${card} flex flex-col gap-4 p-6`}>
          <h2 className="text-2xl font-semibold text-slate-900">Login</h2>
          <p className="text-base text-slate-700">Log into your account and view your pharmacogenomic results.</p>
          <p className="text-sm text-slate-600">Pharmacogenomic means how your genes affect your medicines.</p>
          <Link href="/login" className={`${primaryButton} self-start`}>Log in</Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Haven&apos;t been tested yet?</h2>
          <p className="mt-1 text-base text-slate-700">
            Order your test with one saliva sample. See how 8 of your genes may affect common medications.
          </p>
          <p className="mt-3"><Link href="/order" className={textLink}>Order your test</Link></p>
        </div>
      </section>

      <section aria-labelledby="how-heading" className="flex flex-col gap-4">
        <h2 id="how-heading" className="text-xl font-semibold text-slate-900">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-700 text-base font-bold text-white">
                {index + 1}
              </span>
              <span className="text-base font-medium text-slate-900">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
