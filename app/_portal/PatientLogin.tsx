"use client";

import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { loadSample, loadUpload, type Loaded } from "./load-vcf";
import { findDemoAccount, SAMPLE_PATIENTS } from "./samples";
import { fieldInput, primaryButton } from "./ui";

type Status = { state: "idle" } | { state: "loading"; label: string } | { state: "error"; message: string };

/**
 * Demo email/password login for the three sample patients, plus a local VCF
 * upload. Tapping a demo name fills in its login. Nothing is sent to a server,
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
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-5">
      <h2 id={`${id}-heading`} className="text-xl font-semibold text-slate-900">{heading}</h2>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">Demo accounts: tap a name to fill in the login.</p>
        <ul className="flex flex-wrap gap-2">
          {SAMPLE_PATIENTS.map((sample) => (
            <li key={sample.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => { setEmail(sample.email); setPassword(sample.password); setStatus({ state: "idle" }); }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-400 bg-white px-4 py-2 text-base font-semibold text-slate-900 hover:border-teal-700 hover:bg-teal-50 disabled:opacity-60"
              >
                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-sm text-white">{sample.name[0]}</span>
                {sample.name}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-600">Sample patients are made-up test files, not real people.</p>
      </div>

      <form onSubmit={(event) => void logIn(event)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-email`} className="text-base font-medium text-slate-900">Email</label>
          <input id={`${id}-email`} type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldInput} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-password`} className="text-base font-medium text-slate-900">Password</label>
          <input id={`${id}-password`} type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} className={fieldInput} />
        </div>
        <button type="submit" disabled={busy} className={`${primaryButton} self-start`}>Log in</button>
      </form>

      <div aria-live="polite">
        {status.state === "loading" && <p className="text-base text-slate-700">{status.label}</p>}
      </div>
      {status.state === "error" && (
        <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-base text-red-900">
          <span className="font-semibold">Error: </span>{status.message}
        </p>
      )}

      <details className="rounded-xl border border-dashed border-slate-400 p-4">
        <summary className="cursor-pointer text-base font-medium text-slate-900">Or upload your own VCF</summary>
        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor={`${id}-file`} className="text-sm font-medium text-slate-900">Choose a VCF file</label>
          <p id={`${id}-file-help`} className="text-sm text-slate-600">
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
            className="block min-h-11 w-full text-base file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:font-semibold file:text-white"
          />
        </div>
      </details>
    </section>
  );
}
