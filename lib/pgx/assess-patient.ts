/** Browser-only lookup against an allowlisted patient-safe source snapshot. */
import snapshot from "../../data/patient-guidance.v1.json";
import type { ClinicalAssessmentInput } from "./types";

export type PatientAssessment =
  | { status: "matched"; patientText: string; guidelineUrl: string; humanClinicalReview: boolean }
  | { status: "indeterminate" | "insufficient_data"; message: string };

export function assessPatient(input: ClinicalAssessmentInput): PatientAssessment {
  if (input.callStatus !== "complete") {
    return { status: "indeterminate", message: "A verified, complete PGx call is required." };
  }
  const geneResults = input.geneResults.filter((result) => result.gene.toUpperCase() === snapshot.pair.gene);
  if (geneResults.length !== 1 || !geneResults[0].diplotype || geneResults[0].phenotype === "Indeterminate") {
    return { status: "indeterminate", message: "The PGx call could not be determined." };
  }
  if (input.drug.trim().toLowerCase() !== snapshot.pair.drug || !input.context) {
    return { status: "insufficient_data", message: "No matching guidance is available for this drug and condition." };
  }
  const row = snapshot.records.find((item) => item.phenotype === geneResults[0].phenotype && item.context === input.context);
  if (!row) return { status: "insufficient_data", message: "No matching guidance is available for this result and condition." };
  return { status: "matched", patientText: row.patientText, guidelineUrl: snapshot.source.guidelineUrl, humanClinicalReview: row.humanClinicalReview };
}
