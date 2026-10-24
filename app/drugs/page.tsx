import Link from "next/link";
import { listDrugTherapeuticGroups } from "../../lib/pgx/drug-therapeutic-groups";

export default function DrugsPage() {
  const groups = listDrugTherapeuticGroups();
  const count = groups.reduce((total, group) => total + group.drugs.length, 0);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-5 py-12 sm:py-16">
      <Link href="/patient" className="text-sm font-medium text-royal underline decoration-royal/40 underline-offset-4 hover:decoration-royal">← PGx file intake</Link>
      <header className="space-y-4">
        <h1 className="display text-5xl text-ink sm:text-7xl">Medication research catalog</h1>
        <p className="max-w-3xl text-lg text-ink/85">Browse {count} drugs with CPIC gene–drug links across nine areas. These are medications we are researching, not drugs recommended for you.</p>
        <p className="max-w-3xl text-sm text-ink/80">A listed gene–drug link does not establish whether a medication will work, fail, or be safe for any person. Interpretation requires a verified test result, the reason for treatment, and clinician review.</p>
      </header>
      <nav aria-label="Medication areas" className="flex flex-wrap gap-2">
        {groups.map((group) => <a key={group.id} href={`#${group.id}`} className="rounded-full border border-royal/20 bg-mist px-3.5 py-1.5 text-sm font-medium text-royal hover:underline">
          {group.label} ({group.drugs.length})
        </a>)}
      </nav>
      {groups.map((group) => <section key={group.id} id={group.id} className="scroll-mt-6 space-y-4 rounded-[1.75rem] border border-ink/10 bg-white p-5 sm:p-7" aria-labelledby={`${group.id}-heading`}>
        <h2 id={`${group.id}-heading`} className="display text-3xl text-ink sm:text-4xl">{group.label} <span className="font-sans text-sm font-normal text-ink/75">({group.drugs.length})</span></h2>
        {group.drugs.length === 0
          ? <p className="text-sm text-ink/80">No drugs from the current eight-gene CPIC research index are in this group yet.</p>
          : <ul className="grid gap-3 sm:grid-cols-2">
            {group.drugs.map((drug) => <li key={drug.rxnormId} className="space-y-1 rounded-2xl border border-ink/10 bg-paper p-4 text-ink">
              <p className="text-lg font-semibold capitalize">{drug.genericName}</p>
              <p className="text-sm text-ink/80">U.S. brand names: {drug.brandNames.length
                ? drug.brandNames.map((brand) => brand.name).join(", ")
                : "None found in the current prescribable RxNorm subset"}</p>
              <p className="text-sm text-ink/80">{drug.family} · {drug.rxnormId}</p>
              <p className="text-sm text-ink/80">Indexed gene{drug.indexedGenes.length === 1 ? "" : "s"}: {drug.indexedGenes.join(", ")}</p>
              <a href={drug.guidelineUrl} target="_blank" rel="noreferrer" className="inline-block pt-1 text-sm font-semibold text-royal underline decoration-royal/40 underline-offset-4 hover:decoration-royal">CPIC guideline</a>
            </li>)}</ul>}
      </section>)}
      <p className="text-sm text-ink/80">Categories are broad navigation labels. A medication may have other uses or require genes beyond the ones indexed here. Brand names are current U.S. RxNorm display aliases for single-ingredient products; names and availability can change. A brand name alone does not verify an exact product or dose. This catalog does not provide patient-specific responses or prescriptions.</p>
      <p className="text-xs text-ink/80">This product uses publicly available data from the U.S. National Library of Medicine (NLM), National Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and does not endorse or recommend this or any other product.</p>
    </main>
  );
}
