import { describe, expect, it } from "vitest";
import { assessPatient } from "../lib/pgx/assess-patient";
import persona from "../data/personas.json";
import patientSnapshot from "../data/patient-guidance.v1.json";
import type { ClinicalAssessmentInput } from "../lib/pgx/types";

const maya = persona[0] as ClinicalAssessmentInput;

describe("patient-safe assessment boundary", () => {
  it("ships no clinician recommendation fields in the public snapshot", () => {
    const text = JSON.stringify(patientSnapshot);
    expect(text).not.toMatch(/clinicianSummary|alternatives|strength|dosing/i);
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
