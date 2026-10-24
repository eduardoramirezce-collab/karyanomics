import { describe, expect, it } from "vitest";
import { assess } from "../lib/pgx/assess";
import { assessPatient, parsePatientSnapshot } from "../lib/pgx/assess-patient";
import persona from "../data/personas.json";
import patientSnapshot from "../data/patient-guidance.v1.json";
import type { ClinicalAssessmentInput } from "../lib/pgx/types";

const maya = persona[0] as ClinicalAssessmentInput;

describe("patient-safe assessment boundary", () => {
  it("ships no clinician recommendation fields in the public snapshot", () => {
    const text = JSON.stringify(patientSnapshot);
    expect(text).not.toMatch(/clinicianSummary|alternatives|strength|dosing|Verbatim|doseText|implications|comments/i);
    for (const guideline of patientSnapshot.guidelines) {
      for (const record of guideline.records) {
        expect(Object.keys(record).sort()).toEqual(
          ["context", "humanClinicalReview", "lookupKey", "patientText", "phenotypes", "sourceRecommendationId"]);
      }
    }
  });

  it("rejects a patient snapshot that carries a clinician field", () => {
    const leaked = structuredClone(patientSnapshot) as unknown as { guidelines: { records: Record<string, unknown>[] }[] };
    leaked.guidelines[0].records[0].cpicRecommendationVerbatim = "copied by mistake";
    expect(() => parsePatientSnapshot(leaked)).toThrow(/non-allowlisted/);
  });

  it("picks the same CPIC row as the clinician engine", () => {
    const patient = assessPatient(maya);
    const clinician = assess(maya);
    expect(patient.status).toBe("matched");
    expect(clinician.status).toBe("matched");
    if (patient.status === "matched" && clinician.status === "matched") {
      expect(patient.patientText).toBe(clinician.patientText);
      expect(patient.guidelineUrl).toBe(clinician.source.guidelineUrl);
    }
  });

  it("matches the fictional demo using only patient wording", () => {
    const result = assessPatient(maya);
    expect(result.status).toBe("matched");
    if (result.status === "matched") {
      expect(result.patientText).toMatch(/Discuss the result/);
      expect(result.humanClinicalReview).toBe(false);
    }
  });

  it("keeps unverified uploaded calls indeterminate", () => {
    expect(assessPatient({ ...maya, callStatus: "unverified" }).status).toBe("indeterminate");
    expect(assessPatient({
      ...maya,
      drug: "RxNorm:32968",
      geneResults: [{ gene: "CYP2C19", diplotype: "*2/*2", phenotype: "Poor Metabolizer", source: "lab-report" }],
    }).status).toBe("indeterminate");
  });
});
