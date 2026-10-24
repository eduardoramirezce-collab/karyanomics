"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { listDrugTherapeuticGroups, type DrugResearchEntry } from "../../lib/pgx/drug-therapeutic-groups";
import { buildDrugResult, buildGeneCards, VCF_GENES, type ResultSource } from "../../lib/pgx/drugResult";
import Diplotype from "../_portal/Diplotype";
import { buildDrugOptions, exactDrugOption, searchDrugOptions, type DrugOption } from "../_portal/drug-search";
import DrugResultCard from "../_portal/DrugResultCard";
import { useSession, type Session } from "../_portal/session";
import StatusChip from "../_portal/StatusChip";
import { card, fieldInput, primaryButton, secondaryButton, textLink } from "../_portal/ui";

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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-5 py-8">
      <SessionBanner session={session} onSignOut={() => { setLeaving(true); signOut(); router.push("/"); }} />
      <MedicationSection session={session} />
      <p><Link href="/drugs" className={textLink}>Browse all medications</Link></p>
      {session.role === "clinician" ? <AllGenes session={session} /> : <GeneSummary session={session} />}
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

type View =
  | { kind: "group"; groupId: string }
  | { kind: "drug"; option: DrugOption }
  | { kind: "pick"; query: string; options: DrugOption[] }
  | { kind: "none"; query: string }
  | null;

function MedicationSection({ session }: { session: Session }) {
  const id = useId();
  const groups = useMemo(() => listDrugTherapeuticGroups().filter((group) => group.drugs.length > 0), []);
  const options = useMemo(() => buildDrugOptions(groups), [groups]);
  const [selected, setSelected] = useState(groups[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>(null);

  const source: ResultSource = session.source.kind === "sample" ? { kind: "sample", id: session.source.id } : { kind: "upload" };
  const resultFor = (drug: DrugResearchEntry) =>
    buildDrugResult({ drug, role: session.role, source, parsed: session.parsed, calls: session.calls });

  function searchByName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exact = exactDrugOption(query, options);
    if (exact) return setView({ kind: "drug", option: exact });
    const matches = searchDrugOptions(query, options);
    if (matches.length === 1) return setView({ kind: "drug", option: matches[0] });
    setView(matches.length ? { kind: "pick", query, options: matches } : { kind: "none", query });
  }

  const group = view?.kind === "group" ? groups.find((item) => item.id === view.groupId) ?? null : null;

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-5">
      <h2 id={`${id}-heading`} className="text-2xl font-semibold text-slate-900">Check your medications</h2>

      <div className={`${card} grid gap-5 md:grid-cols-2`}>
        <form onSubmit={searchByName} className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-name`} className="text-base font-medium text-slate-900">Search by brand or generic name</label>
          <div className="flex gap-2">
            <input
              id={`${id}-name`}
              type="search"
              list={`${id}-names`}
              autoComplete="off"
              placeholder="e.g. Plavix or simvastatin"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${fieldInput} min-w-0 flex-1`}
            />
            <button type="submit" className={primaryButton}>Search</button>
          </div>
          <datalist id={`${id}-names`}>
            {options.map((option) => (
              <option key={`${option.label}-${option.drug.drug}`} value={option.label}>
                {option.brand ? `Brand of ${option.drug.genericName}` : "Generic name"}
              </option>
            ))}
          </datalist>
        </form>

        <form
          onSubmit={(event) => { event.preventDefault(); setView({ kind: "group", groupId: selected }); }}
          className="flex flex-col gap-1.5"
        >
          <label htmlFor={`${id}-group`} className="text-base font-medium text-slate-900">Or check a medication group</label>
          <div className="flex gap-2">
            <select
              id={`${id}-group`}
              value={selected}
              onChange={(event) => { setSelected(event.target.value); if (view?.kind === "group") setView(null); }}
              className={`${fieldInput} min-w-0 flex-1`}
            >
              {groups.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <button type="submit" className={primaryButton}>Search</button>
          </div>
        </form>
      </div>

      <div aria-live="polite" className="flex flex-col gap-4">
        {view?.kind === "group" && group && (
          <>
            <p className="text-base text-slate-700">Showing {group.drugs.length} medications in {group.label}.</p>
            <ul className="grid gap-4 md:grid-cols-2">
              {group.drugs.map((drug) => <li key={drug.drug}><DrugResultCard result={resultFor(drug)} /></li>)}
            </ul>
          </>
        )}
        {view?.kind === "drug" && (
          <>
            {view.option.brand && (
              <p className="text-base text-slate-700">
                {view.option.brand} is a brand of {view.option.drug.genericName}. These results are for {view.option.drug.genericName}.
                Ask your pharmacist to confirm this matches your medicine.
              </p>
            )}
            <div className="max-w-xl"><DrugResultCard result={resultFor(view.option.drug)} /></div>
          </>
        )}
        {view?.kind === "pick" && (
          <div className="flex flex-col gap-2">
            <p className="text-base text-slate-700">Pick a medication that matches &quot;{view.query}&quot;:</p>
            <ul className="flex flex-wrap gap-2">
              {view.options.map((option) => (
                <li key={`${option.label}-${option.drug.drug}`}>
                  <button type="button" onClick={() => { setQuery(option.label); setView({ kind: "drug", option }); }}
                    className="min-h-11 rounded-full border border-slate-400 bg-white px-4 py-2 text-base text-slate-900 hover:border-teal-700 hover:bg-teal-50">
                    {option.label}{option.brand ? ` (${option.drug.genericName})` : ""}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {view?.kind === "none" && (
          <p className="text-base text-slate-700">
            We couldn&apos;t find &quot;{view.query}&quot; in the medications this test covers. Try another name, or browse all medications.
          </p>
        )}
      </div>
    </section>
  );
}

/** Patient view: a compact, collapsible summary of the 8 genes read from the file. */
function GeneSummary({ session }: { session: Session }) {
  const genes = useMemo(
    () => buildGeneCards(session.calls, "patient").filter((gene) => (VCF_GENES as readonly string[]).includes(gene.gene)),
    [session],
  );
  return (
    <section aria-labelledby="gene-summary-heading" className="flex flex-col gap-3">
      <h2 id="gene-summary-heading" className="text-2xl font-semibold text-slate-900">Gene summary</h2>
      <details className={card}>
        <summary className="cursor-pointer text-base font-medium text-slate-900">
          See the {genes.length} genes we analyzed
        </summary>
        <p className="mt-3 text-sm text-slate-600">
          Each gene helps your body handle some medicines. The result group (phenotype) shows how your gene may work.
        </p>
        <ul className="mt-3 divide-y divide-slate-200">
          {genes.map((gene) => (
            <li key={gene.gene} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="font-mono text-base font-semibold text-slate-900">{gene.gene}</span>
                <span className="text-sm text-slate-600">{gene.description}</span>
                <span className="text-base text-slate-800">{gene.phenotypeText}</span>
              </div>
              <div className="shrink-0"><StatusChip status={gene.status} /></div>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

/** Clinician view: every gene from the caller, with diplotype, activity score, and phase. */
function AllGenes({ session }: { session: Session }) {
  const cards = useMemo(() => buildGeneCards(session.calls, "clinician"), [session]);
  return (
    <section aria-labelledby="all-genes-heading" className="flex flex-col gap-4">
      <h2 id="all-genes-heading" className="text-2xl font-semibold text-slate-900">All genes</h2>
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
