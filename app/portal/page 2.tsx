"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode, type SyntheticEvent } from "react";
import { listDrugTherapeuticGroups, type DrugResearchEntry } from "../../lib/pgx/drug-therapeutic-groups";
import { buildDrugResult, buildGeneCards, VCF_GENES, type GeneCard, type ResultSource } from "../../lib/pgx/drugResult";
import AnimatedCount from "../_motion/AnimatedCount";
import { gsap, MOTION_OK, useGSAP } from "../_motion/gsap";
import Diplotype from "../_portal/Diplotype";
import { buildDrugOptions, exactDrugOption, searchDrugOptions, type DrugOption } from "../_portal/drug-search";
import DrugResultCard from "../_portal/DrugResultCard";
import { useSession, type Session } from "../_portal/session";
import StatusChip from "../_portal/StatusChip";
import { card, eyebrow, secondaryButton, textLink } from "../_portal/ui";

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
      <main className="mx-auto w-full max-w-3xl px-5 py-16">
        <h1 className="sr-only">Your results</h1>
        {restore === "failed" ? (
          <div role="alert" className="flex flex-col gap-2">
            <p className="text-base text-ink">We couldn&apos;t reload your sample results.</p>
            <Link href="/login" className={textLink}>Go to sign in</Link>
          </div>
        ) : (
          <p aria-live="polite" className="inline-flex items-center gap-2 text-base text-ink/80">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-royal" />
            Loading your results…
          </p>
        )}
      </main>
    );
  }

  return (
    <>
      <SessionBanner session={session} onSignOut={() => { setLeaving(true); signOut(); router.push("/"); }} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-5 py-10 sm:py-14">
        <MedicationSection session={session} />
        <p>
          <Link href="/drugs" className="group inline-flex items-center gap-2 rounded text-base font-semibold text-royal">
            Browse all medications
            <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        </p>
        {session.role === "clinician" ? <AllGenes session={session} /> : <GeneSummary session={session} />}
      </main>
    </>
  );
}

/** Sticky glass header: who is signed in, for whom, and sign out. */
function SessionBanner({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const who = session.role === "clinician"
    ? `Signed in as clinician (NPI ${session.npi}) on behalf of ${session.patientName}`
    : "Signed in as patient";
  return (
    <section aria-label="Session" className="sticky top-0 z-30 border-b border-ink/10 bg-paper/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink to-royal text-base font-semibold text-white sm:flex">
            {session.patientName.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <h1 className="break-words text-ink">
              <span className="display text-2xl sm:text-3xl">{session.patientName}&apos;s results</span>{" "}
              <span className="text-sm font-medium text-ink/75">· {who}</span>
            </h1>
            {session.source.kind === "upload" && (
              <p className="text-xs font-medium text-amber-900 sm:text-sm">
                From an uploaded file that has not been verified. For discussion with your prescriber or pharmacist.
              </p>
            )}
          </div>
        </div>
        <button type="button" onClick={onSignOut} className={`${secondaryButton} shrink-0 px-4 py-2 text-sm`}>Sign out</button>
      </div>
    </section>
  );
}

type View =
  | { kind: "group"; groupId: string }
  | { kind: "drug"; option: DrugOption }
  | { kind: "pick"; query: string; options: DrugOption[] }
  | { kind: "none"; query: string }
  | null;

const pillButton =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-ink px-5 text-base font-semibold text-white transition-transform duration-200 hover:-translate-y-px";

function MedicationSection({ session }: { session: Session }) {
  const id = useId();
  const groups = useMemo(() => listDrugTherapeuticGroups().filter((group) => group.drugs.length > 0), []);
  const options = useMemo(() => buildDrugOptions(groups), [groups]);
  const [selected, setSelected] = useState(groups[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>(null);
  // Visual only: bumps on every search so results re-animate.
  const [searchCount, setSearchCount] = useState(0);
  const show = (next: View) => { setView(next); setSearchCount((count) => count + 1); };

  const source: ResultSource = session.source.kind === "sample" ? { kind: "sample", id: session.source.id } : { kind: "upload" };
  const resultFor = (drug: DrugResearchEntry) =>
    buildDrugResult({ drug, role: session.role, source, parsed: session.parsed, calls: session.calls });

  function searchByName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exact = exactDrugOption(query, options);
    if (exact) return show({ kind: "drug", option: exact });
    const matches = searchDrugOptions(query, options);
    if (matches.length === 1) return show({ kind: "drug", option: matches[0] });
    show(matches.length ? { kind: "pick", query, options: matches } : { kind: "none", query });
  }

  const group = view?.kind === "group" ? groups.find((item) => item.id === view.groupId) ?? null : null;

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className={eyebrow}>Your medicines</p>
        <h2 id={`${id}-heading`} className="display text-5xl text-ink sm:text-6xl">Check your medications</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-[1.75rem] border border-ink/10 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(27,31,75,0.45)] sm:p-7 lg:grid-cols-2">
        <form onSubmit={searchByName} className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${id}-name`} className="text-sm font-semibold text-ink">Search by brand or generic name</label>
          <div className="pill-control flex items-center gap-1 rounded-full border border-ink/30 bg-white p-1.5 pl-4 transition-colors hover:border-ink/50">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-ink/70">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id={`${id}-name`}
              type="search"
              size={1}
              list={`${id}-names`}
              autoComplete="off"
              placeholder="e.g. Plavix or simvastatin"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pill-field min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-ink placeholder:text-slate-500"
            />
            <button type="submit" className={pillButton}>Search</button>
          </div>
          <datalist id={`${id}-names`}>
            {options.map((option) => (
              <option key={`${option.label}-${option.drug.drug}`} value={option.label}>
                {option.brand ? `Brand of ${option.drug.genericName}` : "Generic name"}
              </option>
            ))}
          </datalist>
        </form>

        <form onSubmit={(event) => { event.preventDefault(); show({ kind: "group", groupId: selected }); }} className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${id}-group`} className="text-sm font-semibold text-ink">Or check a medication group</label>
          <div className="pill-control flex items-center gap-1 rounded-full border border-ink/30 bg-white p-1.5 transition-colors hover:border-ink/50">
            <select
              id={`${id}-group`}
              value={selected}
              onChange={(event) => { setSelected(event.target.value); if (view?.kind === "group") setView(null); }}
              className="pill-field select-chevron min-h-11 min-w-0 flex-1 cursor-pointer rounded-full bg-transparent pl-4 text-base text-ink"
            >
              {groups.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <button type="submit" className={pillButton}>Search</button>
          </div>
        </form>
      </div>

      <div aria-live="polite" className="flex flex-col gap-6">
        {view?.kind === "group" && group && (
          <>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-ink">
              <span aria-hidden="true" className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-sm font-medium text-ink/75">Showing</span>
                <AnimatedCount value={group.drugs.length} className="display text-6xl leading-none" />
                <span className="text-lg">medications in {group.label}.</span>
              </span>
              <span className="sr-only">Showing {group.drugs.length} medications in {group.label}.</span>
            </p>
            <Stagger key={searchCount} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {group.drugs.map((drug) => <li key={drug.drug} data-stagger><DrugResultCard result={resultFor(drug)} /></li>)}
            </Stagger>
          </>
        )}
        {view?.kind === "drug" && (
          <>
            {view.option.brand && (
              <p className="max-w-2xl rounded-xl border border-royal/15 bg-mist px-4 py-3 text-base text-ink">
                {view.option.brand} is a brand of {view.option.drug.genericName}. These results are for {view.option.drug.genericName}.
                Ask your pharmacist to confirm this matches your medicine.
              </p>
            )}
            <Stagger key={searchCount} className="grid max-w-2xl grid-cols-1">
              <li data-stagger><DrugResultCard result={resultFor(view.option.drug)} /></li>
            </Stagger>
          </>
        )}
        {view?.kind === "pick" && (
          <div className="flex flex-col gap-3">
            <p className="text-base text-ink/80">Pick a medication that matches &quot;{view.query}&quot;:</p>
            <Stagger key={searchCount} className="flex flex-wrap gap-2">
              {view.options.map((option) => (
                <li key={`${option.label}-${option.drug.drug}`} data-stagger>
                  <button type="button" onClick={() => { setQuery(option.label); show({ kind: "drug", option }); }}
                    className="min-h-11 rounded-full border border-ink/20 bg-white px-4 py-2 text-base text-ink transition-transform duration-200 hover:-translate-y-0.5 hover:border-royal">
                    {option.label}{option.brand ? ` (${option.drug.genericName})` : ""}
                  </button>
                </li>
              ))}
            </Stagger>
          </div>
        )}
        {view?.kind === "none" && (
          <p className="text-base text-ink/80">
            We couldn&apos;t find &quot;{view.query}&quot; in the medications this test covers. Try another name, or browse all medications.
          </p>
        )}
      </div>
    </section>
  );
}

/** A list whose [data-stagger] items rise in with a 40ms stagger (opacity + y only). */
function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLUListElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.from("[data-stagger]", { opacity: 0, y: 18, duration: 0.5, ease: "power3.out", stagger: 0.04 });
    });
    return () => mm.revert();
  }, { scope: root });
  return <ul ref={root} className={className}>{children}</ul>;
}

function GeneTile({ gene }: { gene: GeneCard }) {
  return (
    <li data-gene className={`${card} flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-ink">{gene.gene}</h3>
        <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky" />
      </div>
      <p className="text-sm text-ink/75">{gene.description}</p>
      <p className="text-base font-medium text-ink">{gene.phenotypeText}</p>
      <div className="mt-auto"><StatusChip status={gene.status} /></div>
      {gene.clinician && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-ink/10 pt-3 text-sm text-ink">
          <dt className="text-ink/75">Diplotype</dt>
          <dd><Diplotype gene={gene.gene} diplotype={gene.clinician.diplotype} /></dd>
          <dt className="text-ink/75">Activity score</dt>
          <dd>{gene.clinician.activityScore ?? "Not applicable"}</dd>
          <dt className="text-ink/75">Ambiguous</dt>
          <dd>{gene.clinician.phaseAssumed ? "Phase assumed: yes" : "Phase assumed: no"}</dd>
          {gene.clinician.note && <><dt className="text-ink/75">Note</dt><dd className="break-words">{gene.clinician.note}</dd></>}
        </dl>
      )}
    </li>
  );
}

/** Patient view: a compact, collapsible summary of the 8 genes read from the file. */
function GeneSummary({ session }: { session: Session }) {
  const root = useRef<HTMLElement>(null);
  const genes = useMemo(
    () => buildGeneCards(session.calls, "patient").filter((gene) => (VCF_GENES as readonly string[]).includes(gene.gene)),
    [session],
  );
  const { contextSafe } = useGSAP({ scope: root });
  const onToggle = contextSafe((event: SyntheticEvent<HTMLDetailsElement>) => {
    if (!event.currentTarget.open || !window.matchMedia(MOTION_OK).matches) return;
    gsap.from("[data-gene]", { opacity: 0, y: 16, duration: 0.45, ease: "power3.out", stagger: 0.04 });
  });
  return (
    <section ref={root} aria-labelledby="gene-summary-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p className={eyebrow}>Your panel</p>
        <h2 id="gene-summary-heading" className="display text-5xl text-ink sm:text-6xl">Gene summary</h2>
      </div>
      <details onToggle={onToggle} className="group rounded-[1.75rem] border border-ink/10 bg-white p-5 sm:p-7">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-full text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
          See the {genes.length} genes we analyzed
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-royal transition-transform duration-300 group-open:rotate-45">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
        </summary>
        <p className="mt-4 text-sm text-ink/75">
          Each gene helps your body handle some medicines. The result group (phenotype) shows how your gene may work.
        </p>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {genes.map((gene) => <GeneTile key={gene.gene} gene={gene} />)}
        </ul>
      </details>
    </section>
  );
}

/** Clinician view: every gene from the caller, with diplotype, activity score, and phase. */
function AllGenes({ session }: { session: Session }) {
  const root = useRef<HTMLElement>(null);
  const cards = useMemo(() => buildGeneCards(session.calls, "clinician"), [session]);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.from("[data-gene]", {
        opacity: 0, y: 20, duration: 0.55, ease: "power3.out", stagger: 0.05,
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
      });
    });
    return () => mm.revert();
  }, { scope: root });
  return (
    <section ref={root} aria-labelledby="all-genes-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p className={eyebrow}>Clinician detail</p>
        <h2 id="all-genes-heading" className="display text-5xl text-ink sm:text-6xl">All genes</h2>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((gene) => <GeneTile key={gene.gene} gene={gene} />)}
      </ul>
    </section>
  );
}
