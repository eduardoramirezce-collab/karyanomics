import catalog from "../../data/cpic-gene-drug-catalog.v1.json";

export interface PairCandidate {
  gene: string;
  drug: string;
  rxnormId: string;
  guideline: string;
  guidelineUrl: string;
  cpicLevel: "A" | "B";
  status: "pair_metadata_only";
}

/**
 * Source-backed discovery only. A gene–drug pair is not a patient-specific
 * recommendation; this function never reads or evaluates a genotype.
 */
export function findGeneDrugPairCandidates(drug: string): PairCandidate[] {
  const key = drug.trim().toLowerCase();
  if (!key) return [];
  return catalog.genes.flatMap(({ gene, pairs }) =>
    pairs.filter((pair) => pair.drug.toLowerCase() === key || pair.rxnormId.toLowerCase() === key)
      .map((pair) => ({ gene, ...pair } as PairCandidate)),
  );
}

export function listReportGeneCoverage() {
  return catalog.genes.map(({ gene, sampleCalls, pairs, status }) => ({
    gene,
    sampleCalls,
    sourcePairCount: pairs.length,
    status,
    personalizedGuidanceReady: false as const,
  }));
}
