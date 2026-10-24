"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Loaded } from "../_portal/load-vcf";
import PatientLogin from "../_portal/PatientLogin";
import { useSession } from "../_portal/session";
import type { Role } from "../_portal/session-record";
import { card, fieldInput, primaryButton, secondaryButton } from "../_portal/ui";

const TABS: { role: Role; label: string }[] = [
  { role: "patient", label: "Patient" },
  { role: "clinician", label: "Clinician" },
];
/** Judge demo values. Placeholders only; not a real clinician. */
const DEMO_CLINICIAN = { npi: "1234567890", lastName: "Demo", dob: "1980-01-01" };

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

      <div role="tabpanel" id={`${id}-panel-patient`} aria-labelledby={`${id}-tab-patient`} hidden={active !== "patient"} className={card}>
        <PatientLogin heading="Log in to your account" onLoaded={(loaded) => enter("patient", null, loaded)} />
      </div>

      <div role="tabpanel" id={`${id}-panel-clinician`} aria-labelledby={`${id}-tab-clinician`} hidden={active !== "clinician"} className={card}>
        <ClinicianPanel onLoaded={(npi, loaded) => enter("clinician", npi, loaded)} />
      </div>
    </div>
  );
}

function ClinicianPanel({ onLoaded }: { onLoaded: (npi: string, loaded: Loaded) => void }) {
  const id = useId();
  const npiRef = useRef<HTMLInputElement>(null);
  const [npi, setNpi] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [accepted, setAccepted] = useState<{ npi: string; lastName: string } | null>(null);
  const [error, setError] = useState(false);

  function edit(setter: (value: string) => void, value: string) {
    setter(value);
    setAccepted(null);
  }

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // DEMO ONLY: any non-empty NPI, last name, and date of birth are accepted.
    // TODO: add NPI check-digit (Luhn) validation and a CMS NPPES registry lookup
    // that matches the last name before real use. DOB is never stored or sent.
    const trimmed = { npi: npi.trim(), lastName: lastName.trim() };
    if (!trimmed.npi || !trimmed.lastName || !dob) {
      setError(true);
      setAccepted(null);
      npiRef.current?.focus();
      return;
    }
    setError(false);
    setAccepted(trimmed);
  }

  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={signIn} className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Clinician sign in</h2>
        <p className="text-sm text-slate-600">Demo access only. This does not verify your identity.</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-npi`} className="text-base font-medium text-slate-900">NPI number</label>
          <input id={`${id}-npi`} ref={npiRef} type="text" inputMode="numeric" autoComplete="off" value={npi}
            onChange={(event) => edit(setNpi, event.target.value)}
            aria-invalid={(error && !npi.trim()) || undefined} aria-describedby={error ? errorId : undefined} className={fieldInput} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-last`} className="text-base font-medium text-slate-900">Last name</label>
          <input id={`${id}-last`} type="text" autoComplete="off" value={lastName}
            onChange={(event) => edit(setLastName, event.target.value)}
            aria-invalid={(error && !lastName.trim()) || undefined} aria-describedby={error ? errorId : undefined} className={fieldInput} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-dob`} className="text-base font-medium text-slate-900">Date of birth</label>
          <input id={`${id}-dob`} type="date" autoComplete="off" value={dob}
            onChange={(event) => edit(setDob, event.target.value)}
            aria-invalid={(error && !dob) || undefined} aria-describedby={error ? errorId : undefined} className={fieldInput} />
        </div>
        {error && <p id={errorId} className="text-base text-red-800">Enter your NPI number, last name, and date of birth to continue.</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={primaryButton}>Sign in</button>
          <button type="button" className={secondaryButton} onClick={() => {
            setNpi(DEMO_CLINICIAN.npi); setLastName(DEMO_CLINICIAN.lastName); setDob(DEMO_CLINICIAN.dob);
            setError(false); setAccepted(null);
          }}>
            Judge demo access
          </button>
        </div>
      </form>
      {accepted && (
        <div className="border-t border-slate-200 pt-6">
          <p className="mb-4 text-sm text-slate-700">Signed in as Dr. {accepted.lastName}, NPI {accepted.npi} (demo).</p>
          <PatientLogin heading="Log in to your patient's account" onLoaded={(loaded) => onLoaded(accepted.npi, loaded)} />
        </div>
      )}
    </div>
  );
}
