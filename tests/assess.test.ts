import { describe, expect, it } from "vitest";
import { assess } from "../lib/pgx/assess";
import type { ClinicalAssessmentInput } from "../lib/pgx/types";
import personas from "../data/personas.json";

const maya = personas[0] as ClinicalAssessmentInput;

describe("source-backed PGx assessment", () => {
  it("matches Maya to the ACS/PCI guidance with provenance", () => {
    const result = assess(maya);
    expect(result.status).toBe("matched");
    if (result.status !== "matched") return;
    expect(result.finding).toBe("reduced_activation");
    expect(result.strength).toBe("Strong");
    expect(result.source.recommendationId).toBe(8480389);
    expect(result.source.guidelineUrl).toContain("PA166251443");
    expect(result.humanClinicalReview).toBe(false);
    expect(result.patientText).not.toMatch(/\b(start|stop|take|dose)\b/i);
  });

  it("does not label a normal metabolizer as guaranteed to respond", () => {
    const result = assess({
      ...maya,
      geneResults: [
        { gene: "CYP2C19", diplotype: "*1/*1", phenotype: "Normal Metabolizer", source: "demo" },
      ],
    });
    expect(result.status).toBe("matched");
    if (result.status !== "matched") return;
    expect(result.finding).toBe("no_pgx_change_identified");
    expect(result.patientText).toContain("Other factors still affect treatment");
  });

  it.each([
    [{ ...maya, callStatus: "incomplete" }],
    [{ ...maya, callStatus: "unverified" }],
    [{ ...maya, geneResults: [] }],
    [{ ...maya, geneResults: [{ gene: "CYP2C19", diplotype: null, phenotype: "Indeterminate", source: "vcf" }] }],
  ] as const)("does not interpret incomplete or ambiguous genetic input", (input) => {
    expect(assess(input as ClinicalAssessmentInput).status).toBe("indeterminate");
  });

  it("requires an explicit clinical context", () => {
    expect(assess({ ...maya, context: null })).toEqual({
      status: "insufficient_data",
      reason: "context_required",
    });
  });

  it("does not invent guidance for a different drug or phenotype", () => {
    expect(assess({ ...maya, drug: "warfarin" }).status).toBe("insufficient_data");
    expect(
      assess({
        ...maya,
        geneResults: [{ gene: "CYP2C19", diplotype: "*1/*2", phenotype: "Intermediate Metabolizer", source: "vcf" }],
      }).status,
    ).toBe("insufficient_data");
  });
});
