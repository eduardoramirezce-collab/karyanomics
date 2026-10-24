import type { DrugResult } from "../../lib/pgx/drugResult";
import Diplotype from "./Diplotype";
import StatusChip from "./StatusChip";
import { card, textLink } from "./ui";

/** Renders only what buildDrugResult returns. Clinician rows appear only on clinician results. */
export default function DrugResultCard({ result }: { result: DrugResult }) {
  return (
    <article className={`${card} flex flex-col gap-3`} aria-labelledby={`drug-${result.drug}`}>
      <div className="flex flex-col gap-1">
        <h3 id={`drug-${result.drug}`} className="text-xl font-semibold capitalize text-slate-900">{result.genericName}</h3>
        <p className="text-sm text-slate-600">
          {result.brandNames.length ? `U.S. brand names: ${result.brandNames.join(", ")}` : "No current U.S. brand name listed"}
        </p>
      </div>
      <div><StatusChip status={result.status} /></div>

      {result.genes.length > 0 && (
        <dl className="flex flex-col gap-1 text-base">
          {result.genes.map((gene) => (
            <div key={gene.gene} className="flex flex-wrap gap-x-2">
              <dt className="font-mono font-semibold text-slate-900">{gene.gene}:</dt>
              <dd className="text-slate-800">{gene.phenotypeText}</dd>
            </div>
          ))}
        </dl>
      )}
      {result.unreadGeneLine && <p className="text-base text-slate-700">{result.unreadGeneLine}</p>}
      {result.conditionLabel && <p className="text-sm font-medium text-slate-700">{result.conditionLabel}</p>}
      <p className="text-base text-slate-900">{result.guidanceLine}</p>
      {result.typicalLimitLine && <p className="text-sm text-slate-700">{result.typicalLimitLine}</p>}
      {result.reviewNote && <p className="text-sm italic text-slate-600">{result.reviewNote}</p>}
      <p>
        <a className={textLink} href={result.guidelineUrl} target="_blank" rel="noreferrer">CPIC guideline</a>
      </p>

      {result.role === "clinician" && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Research source rows for clinician review, not patient guidance.</p>
          {result.genes.length > 0 && (
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th scope="col" className="pb-1 font-medium">Gene</th>
                  <th scope="col" className="pb-1 font-medium">Diplotype</th>
                  <th scope="col" className="pb-1 font-medium">Activity score</th>
                </tr>
              </thead>
              <tbody>
                {result.genes.map((gene) => (
                  <tr key={gene.gene} className="align-top">
                    <td className="py-0.5 font-mono">{gene.gene}</td>
                    <td className="py-0.5"><Diplotype gene={gene.gene} diplotype={gene.diplotype} /></td>
                    <td className="py-0.5">{gene.activityScore ?? "Not applicable"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ul className="flex flex-col gap-2">
            {result.routeRows.map((row, index) => (
              <li key={index} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
                <p className="font-semibold">{row.population ?? "No population"}</p>
                {row.kind === "source_row" ? (
                  <p>
                    CPIC classification (strength): {row.classification} · Recommendation ID {row.recommendationId} ·
                    Guideline version {row.guidelineVersion} · {row.reviewNote}
                  </p>
                ) : (
                  <p>{row.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
