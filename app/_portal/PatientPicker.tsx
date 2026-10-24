"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { loadSample, loadUpload, type Loaded } from "./load-vcf";
import { SAMPLE_PATIENTS, type SamplePatient } from "./samples";

type Status = { state: "idle" } | { state: "loading"; label: string } | { state: "error"; message: string };

/** Three demo accounts plus a local VCF upload. Files are read on this device only. */
export default function PatientPicker({ heading, onLoaded }: { heading: string; onLoaded: (loaded: Loaded) => void }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const busy = status.state === "loading";

  async function chooseSample(sample: SamplePatient) {
    setStatus({ state: "loading", label: `Loading ${sample.name}…` });
    if (inputRef.current) inputRef.current.value = "";
    const result = await loadSample(sample.id);
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
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-4">
      <h2 id={`${id}-heading`} className="text-xl font-semibold text-slate-900">{heading}</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {SAMPLE_PATIENTS.map((sample) => (
          <li key={sample.id}>
            <button
              type="button"
              onClick={() => void chooseSample(sample)}
              disabled={busy}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-400 bg-white p-4 text-left hover:border-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-700 text-lg font-bold text-white">
                {sample.name[0]}
              </span>
              <span className="flex flex-col">
                <span className="text-base font-semibold text-slate-900">{sample.name}</span>
                <span className="text-sm text-slate-600">Demo account</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-600">Sample patients are made-up test files, not real people.</p>

      <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-slate-400 p-4">
        <label htmlFor={`${id}-file`} className="text-base font-medium text-slate-900">Or upload your own VCF</label>
        <p id={`${id}-file-help`} className="text-sm text-slate-600">
          A VCF is a genetic data file. It must use the GRCh38 genome map. Your file is read on this device only. It is never sent anywhere.
        </p>
        <input
          id={`${id}-file`}
          ref={inputRef}
          type="file"
          accept=".vcf"
          aria-describedby={`${id}-file-help`}
          onChange={(event) => void chooseFile(event)}
          disabled={busy}
          className="block min-h-11 w-full text-base file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:font-semibold file:text-white"
        />
      </div>

      <div aria-live="polite">
        {status.state === "loading" && <p className="text-base text-slate-700">{status.label}</p>}
      </div>
      {status.state === "error" && (
        <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-base text-red-900">
          <span className="font-semibold">Error: </span>{status.message}
        </p>
      )}
    </section>
  );
}
