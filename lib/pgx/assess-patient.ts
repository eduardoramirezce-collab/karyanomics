/**
 * Patient engine: browser-only lookup against the allowlisted patient snapshot.
 *
 * It uses the same matcher as assess(), so both engines pick the same CPIC row.
 * It can only ever return the plain-language patient paraphrase and the
 * guideline link; the patient snapshot holds no verbatim CPIC text, strength,
 * alternatives, or dose fields. The snapshot is checked once at module load.
 */
import snapshotData from "../../data/patient-guidance.v1.json";
import { matchGuidance } from "./guidance-match";
import { findPatientTextViolations } from "./patient-text-guard";
import type { ClinicalAssessmentInput, ClinicalContext } from "./types";

export type PatientAssessment =
  | { status: "matched"; patientText: string; guidelineUrl: string; humanClinicalReview: boolean }
  | { status: "indeterminate" | "insufficient_data"; message: string };

interface PatientRecord {
  sourceRecommendationId: number;
  context: ClinicalContext;
  lookupKey: Record<string, string>;
  phenotypes: Record<string, string>;
  patientText: string;
  humanClinicalReview: boolean;
}

interface PatientGuideline {
  guidelineUrl: string;
  pair: { drug: string; rxnormId: string };
  requiresDosingAlgorithm: boolean;
  records: PatientRecord[];
}

const CONTEXTS: readonly ClinicalContext[] = ["acs_pci", "non_acs_pci", "neurovascular", "general"];
const RECORD_KEYS = ["context", "humanClinicalReview", "lookupKey", "patientText", "phenotypes", "sourceRecommendationId"];

function invalid(message: string): never {
  throw new Error(`Invalid patient guidance snapshot: ${message}`);
}

function textRecord(value: unknown, path: string): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${path} must be an object`);
  const entries = Object.entries(value);
  if (!entries.length || entries.some(([, item]) => typeof item !== "string" || !item)) invalid(`${path} must map genes to text`);
  return Object.fromEntries(entries) as Record<string, string>;
}

/** Parse the bundled patient snapshot or throw. Exported for tests. */
export function parsePatientSnapshot(value: unknown): PatientGuideline[] {
  if (!value || typeof value !== "object") invalid("root must be an object");
  const root = value as { schemaVersion?: unknown; guidelines?: unknown };
  if (root.schemaVersion !== 2 || !Array.isArray(root.guidelines)) invalid("expected schemaVersion 2 with guidelines");
  return root.guidelines.map((item, g) => {
    const guideline = item as Record<string, unknown>;
    const source = guideline.source as Record<string, unknown> | undefined;
    const pair = guideline.pair as Record<string, unknown> | undefined;
    if (typeof source?.guidelineUrl !== "string" || !source.guidelineUrl.startsWith("https://www.clinpgx.org/guideline/")) {
      invalid(`guidelines[${g}].source.guidelineUrl`);
    }
    if (typeof pair?.drug !== "string" || typeof pair.rxnormId !== "string" || !/^RxNorm:\d+$/.test(pair.rxnormId)) {
      invalid(`guidelines[${g}].pair`);
    }
    if (typeof guideline.algorithmOnly !== "boolean" || !Array.isArray(guideline.records)) {
      invalid(`guidelines[${g}] shape`);
    }
    const records = guideline.records.map((raw, r) => {
      const row = raw as Record<string, unknown>;
      const path = `guidelines[${g}].records[${r}]`;
      if (Object.keys(row).sort().join() !== RECORD_KEYS.join()) invalid(`${path} has non-allowlisted fields`);
      if (typeof row.sourceRecommendationId !== "number" || !Number.isInteger(row.sourceRecommendationId)) invalid(`${path}.sourceRecommendationId`);
      if (!CONTEXTS.includes(row.context as ClinicalContext)) invalid(`${path}.context`);
      if (typeof row.patientText !== "string" || findPatientTextViolations(row.patientText).length > 0) {
        invalid(`${path}.patientText is missing or contains dose/action wording`);
      }
      if (typeof row.humanClinicalReview !== "boolean") invalid(`${path}.humanClinicalReview`);
      return {
        sourceRecommendationId: row.sourceRecommendationId,
        context: row.context as ClinicalContext,
        lookupKey: textRecord(row.lookupKey, `${path}.lookupKey`),
        phenotypes: textRecord(row.phenotypes, `${path}.phenotypes`),
        patientText: row.patientText,
        humanClinicalReview: row.humanClinicalReview,
      };
    });
    return {
      guidelineUrl: source.guidelineUrl,
      pair: { drug: pair.drug, rxnormId: pair.rxnormId },
      requiresDosingAlgorithm: guideline.algorithmOnly,
      records,
    };
  });
}

const BUNDLED: readonly PatientGuideline[] = Object.freeze(parsePatientSnapshot(snapshotData));

/** Every message a patient can see. Each one passes the patient-text guard (tested). */
export const PATIENT_MESSAGES = Object.freeze({
  callRequired: "A verified, complete PGx call is required.",
  callUndetermined: "The PGx call could not be determined.",
  noDrugMatch: "No matching guidance is available for this drug and condition.",
  noResultMatch: "No matching guidance is available for this result and condition.",
  sourceNoRecommendation: "The guideline makes no recommendation for this result and condition.",
  clinicianAlgorithm: "This medicine needs a clinician to review several factors together. No result is shown here.",
});

export function assessPatient(
  input: ClinicalAssessmentInput,
  guidelines: readonly PatientGuideline[] = BUNDLED,
): PatientAssessment {
  const match = matchGuidance(input, guidelines);
  if (!match.ok) {
    let message: string;
    if (input.callStatus !== "complete") message = PATIENT_MESSAGES.callRequired;
    else if (match.status === "indeterminate") message = PATIENT_MESSAGES.callUndetermined;
    else if (match.reason === "dosing_algorithm_required") message = PATIENT_MESSAGES.clinicianAlgorithm;
    else if (match.reason === "source_no_recommendation") message = PATIENT_MESSAGES.sourceNoRecommendation;
    else if (match.reason === "unsupported_phenotype" || match.reason === "ambiguous_source_rows") {
      message = PATIENT_MESSAGES.noResultMatch;
    } else message = PATIENT_MESSAGES.noDrugMatch;
    return { status: match.status, message };
  }
  const guideline = guidelines[match.guidelineIndex];
  const row = guideline.records[match.recordIndex];
  return {
    status: "matched",
    patientText: row.patientText,
    guidelineUrl: guideline.guidelineUrl,
    humanClinicalReview: row.humanClinicalReview,
  };
}
