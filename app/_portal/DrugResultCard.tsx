import type { DrugResult } from "../../lib/pgx/drugResult";
import Diplotype from "./Diplotype";
import StatusChip from "./StatusChip";

/** Renders only what buildDrugResult returns. Clinician rows appear only on clinician results. */
export default function DrugResultCard({ result }: { result: DrugResult }) {
  return (
    <article
      className="flex h-full flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-[0_1px_2px_rgba(27,31,75,0.04)] sm:p-6"
      aria-labelledby={`drug-${result.drug}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`drug-${result.drug}`} className="display text-3xl capitalize text-ink sm:text-4xl">{result.genericName}</h3>
          <p className="text-sm text-ink/75">
            {result.brandNames.length ? `U.S. brand names: ${result.brandNames.join(", ")}` : "No current U.S. brand name listed"}
          </p>
        </div>
        <StatusChip status={result.status} />
      </header>

      {result.genes.length > 0 && (
        <dl className="flex flex-wrap gap-2">
          {result.genes.map((gene) => (
            <div key={gene.gene} className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-lg border border-ink/10 bg-paper px-2.5 py-1 text-sm">
              <dt className="font-semibold text-ink">{gene.gene}</dt>
              <dd className="text-ink/80">{gene.phenotypeText}</dd>
            </div>
          ))}
        </dl>
      )}
      {result.unreadGeneLine && <p className="text-sm text-ink/80">{result.unreadGeneLine}</p>}

      <div className="flex flex-col gap-2 border-t border-ink/10 pt-4">
        {result.conditionLabel && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-royal">{result.conditionLabel}</p>}
        <p className="text-base leading-relaxed text-ink">{result.guidanceLine}</p>
        {result.typicalLimitLine && <p className="text-sm text-ink/75">{result.typicalLimitLine}</p>}
        {result.reviewNote && <p className="text-sm italic text-ink/75">{result.reviewNote}</p>}
      </div>

      <p className="mt-auto">
        <a
          className="group inline-flex items-center gap-1.5 rounded text-sm font-semibold text-royal underline decoration-royal/0 underline-offset-4 hover:decoration-royal/60"
          href={result.guidelineUrl}
          target="_blank"
          rel="noreferrer"
        >
          CPIC guideline
          <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
        </a>
      </p>

      {result.role === "clinician" && (
        <div className="flex flex-col gap-3 rounded-xl border border-royal/15 bg-mist/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-royal">Research source rows for clinician review, not patient guidance.</p>
          {result.genes.length > 0 && (
            <table className="w-full table-fixed text-left text-sm text-ink">
              <thead>
                <tr className="text-ink/75">
                  <th scope="col" className="pb-1 font-medium">Gene</th>
                  <th scope="col" className="pb-1 font-medium">Diplotype</th>
                  <th scope="col" className="pb-1 font-medium">Activity score</th>
                </tr>
              </thead>
              <tbody>
                {result.genes.map((gene) => (
                  <tr key={gene.gene} className="align-top">
                    <td className="py-0.5 font-semibold break-words">{gene.gene}</td>
                    <td className="py-0.5"><Diplotype gene={gene.gene} diplotype={gene.diplotype} /></td>
                    <td className="py-0.5">{gene.activityScore ?? "Not applicable"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ul className="flex flex-col gap-2">
            {result.routeRows.map((row, index) => (
              <li key={index} className="rounded-lg border border-ink/10 bg-white p-3 text-sm text-ink">
                <p className="font-semibold">{row.population ?? "No population"}</p>
                {row.kind === "source_row" ? (
<<<<<<< HEAD
                  <>
                    <p>
                      CPIC classification (strength): {row.classification} · Recommendation ID {row.recommendationId} ·
                      Guideline version {row.guidelineVersion} · {row.reviewNote}
                    </p>
                    <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
                      <p className="font-semibold text-slate-900">CPIC recommendation (verbatim)</p>
                      <blockquote className="border-l-4 border-slate-300 pl-3 text-slate-900">{row.drugRecommendation || "Not available in the bundled source rows."}</blockquote>
                      {Object.keys(row.implications).length > 0 && (
                        <dl className="flex flex-col gap-1">
                          {Object.entries(row.implications).map(([gene, text]) => (
                            <div key={gene}>
                              <dt className="font-mono font-semibold">{gene} implications (verbatim)</dt>
                              <dd>{text}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <p>
                        <a className={textLink} href={row.guidelineUrl} target="_blank" rel="noreferrer">CPIC guideline (source)</a>
                      </p>
                    </div>
                  </>
=======
                  <p className="text-ink/85">
                    CPIC classification (strength): {row.classification} · Recommendation ID {row.recommendationId} ·
                    Guideline version {row.guidelineVersion} · {row.reviewNote}
                  </p>
>>>>>>> origin/feature/visual-polish
                ) : (
                  <p className="text-ink/85">{row.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
