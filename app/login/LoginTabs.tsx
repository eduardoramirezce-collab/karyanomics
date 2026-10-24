"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Loaded } from "../_portal/load-vcf";
import PatientPicker from "../_portal/PatientPicker";
import { useSession } from "../_portal/session";
import type { Role } from "../_portal/session-record";
import { card, fieldInput, primaryButton, secondaryButton } from "../_portal/ui";

const TABS: { role: Role; label: string }[] = [
  { role: "patient", label: "Patient" },
  { role: "clinician", label: "Clinician" },
];
const DEMO_NPI = "1234567890";

export default function LoginTabs() {
  const id = useId();
  const router = useRouter();
  const { start } = useSession();
  const params = useSearchParams();
  const [active, setActive] = useState<Role>(params.get("role") === "clinician" ? "clinician" : "patient");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function enter(role: Role, npi: string | null, loaded: Loaded) {
    start(role, npi, loaded);
    router.push("/portal");
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setActive(TABS[next].role);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Sign in as" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-300 bg-slate-100 p-1">
        {TABS.map((tab, index) => {
          const selected = active === tab.role;
          return (
            <button
              key={tab.role}
              ref={(el) => { tabRefs.current[index] = el; }}
              id={`${id}-tab-${tab.role}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel-${tab.role}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.role)}
              onKeyDown={(event) => onTabKey(event, index)}
              className={`min-h-11 rounded-lg px-4 py-2 text-base font-semibold ${selected
                ? "border-b-4 border-teal-700 bg-white text-teal-800 shadow-sm"
                : "border-b-4 border-transparent text-slate-700 hover:bg-white/60"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel-patient`}
        aria-labelledby={`${id}-tab-patient`}
        hidden={active !== "patient"}
        className={card}
      >
        <PatientPicker heading="Choose your demo account" onLoaded={(loaded) => enter("patient", null, loaded)} />
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel-clinician`}
        aria-labelledby={`${id}-tab-clinician`}
        hidden={active !== "clinician"}
        className={card}
      >
        <ClinicianPanel onLoaded={(npi, loaded) => enter("clinician", npi, loaded)} />
      </div>
    </div>
  );
}

function ClinicianPanel({ onLoaded }: { onLoaded: (npi: string, loaded: Loaded) => void }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [npi, setNpi] = useState("");
  const [acceptedNpi, setAcceptedNpi] = useState<string | null>(null);
  const [error, setError] = useState(false);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // DEMO ONLY: any non-empty NPI is accepted.
    // TODO: add NPI check-digit (Luhn) validation and a CMS NPPES registry lookup before real use.
    const trimmed = npi.trim();
    if (!trimmed) {
      setError(true);
      setAcceptedNpi(null);
      inputRef.current?.focus();
      return;
    }
    setError(false);
    setAcceptedNpi(trimmed);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={signIn} className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Clinician sign in</h2>
        <p className="text-sm text-slate-600">Demo access only. This does not verify your identity.</p>
        <label htmlFor={`${id}-npi`} className="text-base font-medium text-slate-900">NPI number</label>
        <input
          id={`${id}-npi`}
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={npi}
          onChange={(event) => { setNpi(event.target.value); setAcceptedNpi(null); }}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-npi-error` : undefined}
          className={fieldInput}
        />
        {error && <p id={`${id}-npi-error`} className="text-base text-red-800">Enter an NPI number to continue.</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={primaryButton}>Sign in</button>
          <button type="button" className={secondaryButton} onClick={() => { setNpi(DEMO_NPI); setError(false); setAcceptedNpi(null); }}>
            Judge demo access
          </button>
        </div>
      </form>
      {acceptedNpi && (
        <div className="border-t border-slate-200 pt-6">
          <p className="mb-4 text-sm text-slate-700">Signed in with NPI {acceptedNpi} (demo).</p>
          <PatientPicker heading="Choose a patient" onLoaded={(loaded) => onLoaded(acceptedNpi, loaded)} />
        </div>
      )}
    </div>
  );
}
