"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { listDrugTherapeuticGroups } from "../../lib/pgx/drug-therapeutic-groups";
import { buildDrugResult, buildGeneCards, type ResultSource } from "../../lib/pgx/drugResult";
import Diplotype from "../_portal/Diplotype";
import DrugResultCard from "../_portal/DrugResultCard";
import { useSession, type Session } from "../_portal/session";
import StatusChip from "../_portal/StatusChip";
import { card, primaryButton, secondaryButton, textLink } from "../_portal/ui";

export default function PortalPage() {
  const router = useRouter();
  const { session, restore, restoreFromRecord, signOut } = useSession();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (leaving || session) return;
    if (restore === "idle") void restoreFromRecord();
    else if (restore === "none") router.replace("/login");
  }, [leaving, session, restore, restoreFromRecord, router]);

  if (leaving) return null;
  if (!session) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <h1 className="sr-only">Your results</h1>
        {restore === "failed" ? (
          <div role="alert" className="flex flex-col gap-2">
            <p className="text-base text-slate-900">We couldn&apos;t reload your sample results.</p>
            <Link href="/login" className={textLink}>Go to sign in</Link>
          </div>
        ) : (
          <p aria-live="polite" className="text-base text-slate-700">Loading your results…</p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-8">
      <SessionBanner session={session} onSignOut={() => { setLeaving(true); signOut(); router.push("/"); }} />
      <GeneSection session={session} />
      <MedicationSection session={session} />
      <p><Link href="/drugs" className={textLink}>Browse all medications</Link></p>
    </main>
  );
}

function SessionBanner({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const who = session.role === "clinician"
    ? `Signed in as clinician (NPI ${session.npi}) on behalf of ${session.patientName}`
    : "Signed in as patient";
  return (
    <section aria-label="Session" className="flex flex-col gap-3 rounded-xl border border-teal-700 bg-teal-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="break-words text-2xl font-bold text-slate-900">
          {session.patientName}&apos;s results <span className="text-base font-medium text-slate-700">· {who}</span>
        </h1>
        {session.source.kind === "upload" && (
          <p className="text-sm font-medium text-slate-800">
            From an uploaded file that has not been verified. For discussion with your prescriber or pharmacist.
          </p>
        )}
      </div>
      <button type="button" onClick={onSignOut} className={`${secondaryButton} shrink-0`}>Sign out</button>
    </section>
  );
}

function GeneSection({ session }: { session: Session }) {
  const cards = useMemo(() => buildGeneCards(session.calls, session.role), [session]);
  return (
    <section aria-labelledby="genes-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="genes-heading" className="text-2xl font-semibold text-slate-900">Your genes</h2>
        <p className="text-base text-slate-700">
          Each gene helps your body handle some medicines. A phenotype is the result group your gene falls in.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((gene) => (
          <li key={gene.gene} className={`${card} flex flex-col gap-2`}>
            <h3 className="font-mono text-lg font-semibold text-slate-900">{gene.gene}</h3>
            <p className="text-sm text-slate-600">{gene.description}</p>
            <p className="text-base text-slate-900">{gene.phenotypeText}</p>
            <div><StatusChip status={gene.status} /></div>
            {gene.clinician && (
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-slate-200 pt-2 text-sm text-slate-800">
                <dt className="text-slate-600">Diplotype</dt>
                <dd><Diplotype gene={gene.gene} diplotype={gene.clinician.diplotype} /></dd>
                <dt className="text-slate-600">Activity score</dt>
                <dd>{gene.clinician.activityScore ?? "Not applicable"}</dd>
                <dt className="text-slate-600">Ambiguous</dt>
                <dd>{gene.clinician.phaseAssumed ? "Phase assumed: yes" : "Phase assumed: no"}</dd>
                {gene.clinician.note && <><dt className="text-slate-600">Note</dt><dd>{gene.clinician.note}</dd></>}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MedicationSection({ session }: { session: Session }) {
  const id = useId();
  const groups = useMemo(() => listDrugTherapeuticGroups().filter((group) => group.drugs.length > 0), []);
  const [selected, setSelected] = useState(groups[0]?.id ?? "");
  const [searched, setSearched] = useState<string | null>(null);
  const group = groups.find((item) => item.id === searched && item.id === selected) ?? null;

  const results = useMemo(() => {
    if (!group) return [];
    const source: ResultSource = session.source.kind === "sample"
      ? { kind: "sample", id: session.source.id }
      : { kind: "upload" };
    return group.drugs.map((drug) => buildDrugResult({
      drug, role: session.role, source, parsed: session.parsed, calls: session.calls,
    }));
  }, [group, session]);

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-4">
      <h2 id={`${id}-heading`} className="text-2xl font-semibold text-slate-900">Check your medications</h2>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => { event.preventDefault(); setSearched(selected); }}
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={`${id}-group`} className="text-base font-medium text-slate-900">Medication group</label>
          <select
            id={`${id}-group`}
            value={selected}
            onChange={(event) => { setSelected(event.target.value); setSearched(null); }}
            className="block min-h-11 w-full rounded-lg border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
          >
            {groups.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <button type="submit" className={primaryButton}>Search</button>
      </form>

      <div aria-live="polite" className="flex flex-col gap-4">
        {group && (
          <>
            <p className="text-base text-slate-700">Showing {results.length} medications in {group.label}.</p>
            <ul className="grid gap-4 md:grid-cols-2">
              {results.map((result) => <li key={result.drug}><DrugResultCard result={result} /></li>)}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
