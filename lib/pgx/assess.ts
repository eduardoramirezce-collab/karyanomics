import snapshotData from "../../data/cpic-cyp2c19-clopidogrel.v1.json";
import type { ClinicalAssessment, ClinicalAssessmentInput } from "./types";

/** Pure lookup over a reviewed-for-demo CPIC snapshot. No network or storage I/O. */
export function assess(input: ClinicalAssessmentInput): ClinicalAssessment {
  if (input.callStatus !== "complete") {
    return { status: "indeterminate", reason: "missing_or_unverified_call" };
  }

  const geneResults = input.geneResults.filter(
    (result) => result.gene.toUpperCase() === snapshotData.pair.gene,
  );
  if (geneResults.length !== 1) {
    return { status: "indeterminate", reason: "ambiguous_gene_result" };
  }

  const geneResult = geneResults[0];
  if (!geneResult.diplotype || geneResult.phenotype === "Indeterminate") {
    return { status: "indeterminate", reason: "missing_or_unverified_call" };
  }

  if (input.drug.trim().toLowerCase() !== snapshotData.pair.drug) {
    return { status: "insufficient_data", reason: "unsupported_pair" };
  }
  if (!input.context) {
    return { status: "insufficient_data", reason: "context_required" };
  }

  const record = snapshotData.records.find(
    (candidate) =>
      candidate.phenotype === geneResult.phenotype &&
      candidate.context === input.context,
  );
  if (!record) {
    return { status: "insufficient_data", reason: "unsupported_phenotype" };
  }

  return {
    status: "matched",
    gene: snapshotData.pair.gene,
    drug: snapshotData.pair.drug,
    phenotype: record.phenotype,
    context: "acs_pci",
    strength: record.strength,
    finding: record.finding as "reduced_activation" | "no_pgx_change_identified",
    patientText: record.patientText,
    clinicianSummary: record.clinicianSummary,
    source: {
      guidelineUrl: snapshotData.source.guidelineUrl,
      guidelineVersion: snapshotData.source.guidelineVersion,
      publicationPmid: snapshotData.source.publicationPmid,
      recommendationId: record.sourceRecommendationId,
      retrievedAt: snapshotData.retrievedAt,
    },
    humanClinicalReview: record.humanClinicalReview,
  };
}
