/**
 * Shared, pure matching of verified gene results to one exact CPIC source row.
 *
 * Used by both assess() (clinician engine) and assessPatient() (patient engine)
 * so the two can never disagree about which row applies. It returns indexes into
 * the caller's own data, never text.
 *
 * Rules (.kiro/steering/clinical-safety.md, data-sources.md):
 * - The drug must match one snapshot exactly (generic name or RxNorm ID).
 * - The clinical context must be given and must exist for that drug.
 * - Every gene in the source lookup key needs exactly one usable result.
 * - Activity-score keys match the caller's activity score and phenotype.
 * - No row, or more than one row, is insufficient data. Never a neighbour row.
 */

import type { ClinicalAssessment, ClinicalAssessmentInput, ClinicalContext, GeneResult } from "./types";

export interface MatchableRecord {
  context: ClinicalContext;
  lookupKey: Record<string, string>;
  phenotypes: Record<string, string>;
}

export interface MatchableGuideline {
  pair: { drug: string; rxnormId: string };
  requiresDosingAlgorithm: boolean;
  records: readonly MatchableRecord[];
}

type FailureReason = Extract<ClinicalAssessment, { status: "indeterminate" | "insufficient_data" }>["reason"];

export type GuidanceMatch =
  | { ok: true; guidelineIndex: number; recordIndex: number }
  | {
      ok: false;
      status: "indeterminate" | "insufficient_data";
      reason: FailureReason;
      /** Set once the drug has been identified. */
      guidelineIndex?: number;
    };

/** Sources whose calls may be interpreted. Self-reported lab JSON is never one. */
const ACCEPTED_SOURCES: ReadonlySet<GeneResult["source"]> = new Set(["vcf", "outside-call", "demo"]);
const UNUSABLE_PHENOTYPES = new Set(["Indeterminate", "No Result", "n/a"]);
const isNumericKey = (value: string) => /^\d+(?:\.\d+)?$/.test(value);

const indeterminate = (reason: FailureReason, guidelineIndex?: number): GuidanceMatch =>
  ({ ok: false, status: "indeterminate", reason, ...(guidelineIndex === undefined ? {} : { guidelineIndex }) });
const insufficient = (reason: FailureReason, guidelineIndex?: number): GuidanceMatch =>
  ({ ok: false, status: "insufficient_data", reason, ...(guidelineIndex === undefined ? {} : { guidelineIndex }) });

function usable(result: GeneResult): boolean {
  return !!result.diplotype && !result.ambiguous && !!result.phenotype.trim() &&
    !UNUSABLE_PHENOTYPES.has(result.phenotype) && ACCEPTED_SOURCES.has(result.source);
}

function keyMatches(result: GeneResult, key: string, phenotype: string): boolean {
  if (result.phenotype !== phenotype) return false;
  if (!isNumericKey(key)) return result.phenotype === key;
  const score = result.activityScore?.trim();
  return !!score && isNumericKey(score) && Number(score) === Number(key);
}

/** Find the single source row for this input, or the reason there is none. */
export function matchGuidance(
  input: ClinicalAssessmentInput,
  guidelines: readonly MatchableGuideline[],
): GuidanceMatch {
  if (input.callStatus !== "complete") return indeterminate("missing_or_unverified_call");

  const drugId = input.drug.trim().toLowerCase();
  const drugMatches = guidelines.flatMap((guideline, index) =>
    guideline.pair.drug === drugId || guideline.pair.rxnormId.toLowerCase() === drugId ? [index] : []);
  if (drugMatches.length === 0) return insufficient("unsupported_pair");
  if (drugMatches.length > 1) return insufficient("ambiguous_source_rows");
  const guidelineIndex = drugMatches[0];
  const guideline = guidelines[guidelineIndex];

  if (guideline.requiresDosingAlgorithm) return insufficient("dosing_algorithm_required", guidelineIndex);
  if (!input.context) return insufficient("context_required", guidelineIndex);

  const inContext = guideline.records.flatMap((record, index) =>
    record.context === input.context ? [index] : []);
  if (inContext.length === 0) return insufficient("context_not_supported", guidelineIndex);

  const requiredGenes = [...new Set(inContext.flatMap((index) =>
    Object.keys(guideline.records[index].lookupKey)))].sort();
  const results = new Map<string, GeneResult>();
  for (const gene of requiredGenes) {
    const found = input.geneResults.filter((result) => result.gene.toUpperCase() === gene);
    if (found.length === 0) return indeterminate("missing_or_unverified_call", guidelineIndex);
    if (found.length > 1) return indeterminate("ambiguous_gene_result", guidelineIndex);
    if (!usable(found[0])) return indeterminate("missing_or_unverified_call", guidelineIndex);
    results.set(gene, found[0]);
  }

  const rows = inContext.filter((index) => {
    const record = guideline.records[index];
    return Object.entries(record.lookupKey).every(([gene, key]) =>
      keyMatches(results.get(gene)!, key, record.phenotypes[gene]));
  });
  if (rows.length === 0) return insufficient("unsupported_phenotype", guidelineIndex);
  if (rows.length > 1) return insufficient("ambiguous_source_rows", guidelineIndex);
  return { ok: true, guidelineIndex, recordIndex: rows[0] };
}
