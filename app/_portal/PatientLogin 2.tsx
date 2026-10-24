"use client";

import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import FloatingField from "./FloatingField";
import { loadSample, loadUpload, type Loaded } from "./load-vcf";
import { findDemoAccount, SAMPLE_PATIENTS } from "./samples";
import { primaryButton } from "./ui";

type Status = { state: "idle" } | { state: "loading"; label: string } | { state: "error"; message: string };

/**
 * Demo email/password login for the three sample patients, plus a local VCF
 * upload. Tapping a demo card fills in its login. Nothing is sent to a server,
 * and the password is never stored.
 */
export default function PatientLogin({ heading, onLoaded }: { heading: string; onLoaded: (loaded: Loaded) => void }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const busy = status.state === "loading";

  async function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = findDemoAccount(email, password);
    if (!account) {
      setStatus({ state: "error", message: "That email and password don't match a demo account. Tap a demo name to fill them in." });
      return;
    }
    setStatus({ state: "loading", label: `Loading ${account.name}'s results…` });
    const result = await loadSample(account.id);
    if (result.ok) onLoaded(result.value);
    else setStatus({ state: "error", message: result.message });
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus({ state: "loading", label: `Reading ${file.name}…` });
    const result = await loadUpload(file);
    if (result.ok) onLoaded(result.value);
    else setStatus({ state: "error", message: result.message });
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-6">
      <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight text-ink">{heading}</h2>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-ink/80">Demo accounts: tap a name to fill in the login.</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {SAMPLE_PATIENTS.map((sample) => {
            const selected = email.trim().toLowerCase() === sample.email && password === sample.password;
            return (
              <li key={sample.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={busy}
                  onClick={() => { setEmail(sample.email); setPassword(sample.password); setStatus({ state: "idle" }); }}
                  className={`group relative flex w-full flex-col items-start gap-4 rounded-2xl border p-4 text-left transition-transform duration-200 ease-out hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${selected
                    ? "border-royal bg-mist shadow-[0_12px_30px_-18px_rgba(45,80,160,0.9)]"
                    : "border-ink/15 bg-white shadow-[0_1px_2px_rgba(27,31,75,0.05)] hover:shadow-[0_14px_30px_-20px_rgba(27,31,75,0.55)]"}`}
                >
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-ink to-royal text-lg font-semibold text-white">
                    {sample.name[0]}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-lg font-semibold text-ink">{sample.name}</span>
                    <span className="text-sm text-ink/75">Demo account</span>
                  </span>
                  {selected && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-royal px-2 py-0.5 text-xs font-semibold text-white">
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                      Filled
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-ink/75">Sample patients are made-up test files, not real people.</p>
      </div>

      <form onSubmit={(event) => void logIn(event)} className="flex flex-col gap-3">
        <FloatingField id={`${id}-email`} label="Email" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} />
        <FloatingField id={`${id}-password`} label="Password" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button type="submit" disabled={busy} className={`${primaryButton} mt-1 self-start`}>Log in</button>
      </form>

      <div aria-live="polite">
        {status.state === "loading" && (
          <p className="inline-flex items-center gap-2 text-base text-ink/80">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-royal" />
            {status.label}
          </p>
        )}
      </div>
      {status.state === "error" && (
        <p role="alert" className="rounded-xl border border-red-700/60 bg-red-50 p-3 text-base text-red-900">
          <span className="font-semibold">Error: </span>{status.message}
        </p>
      )}

      <details className="group rounded-2xl border border-dashed border-ink/30 bg-paper/60 p-4">
        <summary className="cursor-pointer list-none text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-open:rotate-90"><path d="m9 6 6 6-6 6" /></svg>
            Or upload your own VCF
          </span>
        </summary>
        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor={`${id}-file`} className="text-sm font-medium text-ink">Choose a VCF file</label>
          <p id={`${id}-file-help`} className="text-sm text-ink/75">
            A VCF is a genetic data file. It must use the GRCh38 genome map. Your file is read on this device only. It is never sent anywhere.
          </p>
          <input
            id={`${id}-file`}
            ref={fileRef}
            type="file"
            accept=".vcf"
            aria-describedby={`${id}-file-help`}
            onChange={(event) => void chooseFile(event)}
            disabled={busy}
            className="block min-h-11 w-full text-base text-ink file:mr-4 file:min-h-11 file:rounded-full file:border-0 file:bg-ink file:px-5 file:py-2 file:font-semibold file:text-white"
          />
        </div>
      </details>
    </section>
  );
}
