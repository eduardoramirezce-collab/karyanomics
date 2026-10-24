import Link from "next/link";
import { listDrugTherapeuticGroups } from "../../lib/pgx/drug-therapeutic-groups";

export default function DrugsPage() {
  const groups = listDrugTherapeuticGroups();
  const count = groups.reduce((total, group) => total + group.drugs.length, 0);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 p-6 sm:p-10">
      <Link href="/patient" className="text-sm text-blue-700 underline dark:text-blue-300">← PGx file intake</Link>
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Medication research catalog</h1>
        <p>Browse {count} drugs with CPIC gene–drug links across nine areas. These are medications we are researching, not drugs recommended for you.</p>
        <p className="text-sm">A listed gene–drug link does not establish whether a medication will work, fail, or be safe for any person. Interpretation requires a verified test result, the reason for treatment, and clinician review.</p>
      </header>
      <nav aria-label="Medication areas" className="flex flex-wrap gap-2">
        {groups.map((group) => <a key={group.id} href={`#${group.id}`} className="rounded-full border border-gray-300 px-3 py-1 text-sm hover:underline dark:border-gray-700">
          {group.label} ({group.drugs.length})
        </a>)}
      </nav>
      {groups.map((group) => <section key={group.id} id={group.id} className="space-y-3 rounded-xl border border-gray-300 p-5 dark:border-gray-700" aria-labelledby={`${group.id}-heading`}>
        <h2 id={`${group.id}-heading`} className="text-xl font-semibold">{group.label} <span className="text-sm font-normal">({group.drugs.length})</span></h2>
        {group.drugs.length === 0
          ? <p className="text-sm">No drugs from the current eight-gene CPIC research index are in this group yet.</p>
          : <ul className="grid gap-3 sm:grid-cols-2">
            {group.drugs.map((drug) => <li key={drug.rxnormId} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="font-semibold capitalize">{drug.drug}</p>
              <p className="text-sm">{drug.family} · {drug.rxnormId}</p>
              <p className="text-sm">Indexed gene{drug.indexedGenes.length === 1 ? "" : "s"}: {drug.indexedGenes.join(", ")}</p>
              <a href={drug.guidelineUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline dark:text-blue-300">CPIC guideline</a>
            </li>)}</ul>}
      </section>)}
      <p className="text-sm">Categories are broad navigation labels. A medication may have other uses or require genes beyond the ones indexed here. This catalog does not provide patient-specific responses, prescriptions, or doses.</p>
    </main>
  );
}
