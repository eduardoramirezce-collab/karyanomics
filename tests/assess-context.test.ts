/**
 * Stage 0 blockers: clinical context comes from the record (0.1), verbatim CPIC
 * text is carried (0.2), and malformed snapshots throw at the boundary (0.3).
 */
import { describe, expect, it } from "vitest";
import { assess, BUNDLED_GUIDANCE_SNAPSHOTS } from "../lib/pgx/assess";
import { parseGuidanceSnapshot } from "../lib/pgx/guidance-snapshot";
import { isPatientSafeText } from "../lib/pgx/patient-text-guard";
import type { ClinicalAssessmentInput, ClinicalContext } from "../lib/pgx/types";
import { clopidogrelSnapshotCopy } from "./helpers/guidance";

const poorMetabolizer = (context: ClinicalContext): ClinicalAssessmentInput => ({
  geneResults: [{ gene: "CYP2C19", diplotype: "*2/*2", phenotype: "Poor Metabolizer", source: "demo" }],
  drug: "clopidogrel",
  context,
  callStatus: "complete",
});

describe("0.1 clinical context is taken from the matched record", () => {
  it("never reports a non-ACS record as acs_pci", () => {
    // Relabel a real row as non-ACS (population and context together) to prove
    // assess() reads record.context instead of a literal.
    const copy = clopidogrelSnapshotCopy();
    copy.records = copy.records.filter((row) => row.context === "acs_pci")
      .map((row) => ({ ...row, population: "CVI non-ACS non-PCI", context: "non_acs_pci" }));
    const relabeled = parseGuidanceSnapshot(copy, "relabeled-fixture");

    const result = assess(poorMetabolizer("non_acs_pci"), [relabeled]);
    expect(result.status).toBe("matched");
    if (result.status === "matched") expect(result.context).toBe("non_acs_pci");
    expect(assess(poorMetabolizer("acs_pci"), [relabeled])).toEqual({
      status: "insufficient_data",
      reason: "context_not_supported",
    });
  });

  it("reports every bundled record's own context", () => {
    for (const snapshot of BUNDLED_GUIDANCE_SNAPSHOTS) {
      for (const record of snapshot.records) {
        const result = assess({
          geneResults: Object.entries(record.lookupKey).map(([gene, key]) => ({
            gene,
            diplotype: "fixture",
            phenotype: record.phenotypes[gene],
            activityScore: /^\d/.test(key) ? key : null,
            source: "demo" as const,
          })),
          drug: snapshot.pair.drug,
          context: record.context,
          callStatus: "complete",
        }, [snapshot]);
        if (record.finding === "source_no_recommendation") {
          expect(result).toEqual({ status: "insufficient_data", reason: "source_no_recommendation", recommendationId: record.sourceRecommendationId });
        } else {
          expect(result.status).toBe("matched");
          if (result.status === "matched") {
            expect(result.context).toBe(record.context);
            expect(result.source.recommendationId).toBe(record.sourceRecommendationId);
          }
        }
      }
    }
  });

  it("rejects a record whose context and CPIC population disagree", () => {
    const copy = clopidogrelSnapshotCopy();
    copy.records[0] = { ...copy.records[0], context: "neurovascular" };
    expect(() => parseGuidanceSnapshot(copy, "mismatch")).toThrow(/does not correspond to population/);
  });
});

describe("0.2 verbatim CPIC text is carried to the clinician result", () => {
  it("returns rec 8480389 exactly as CPIC states it", () => {
    const result = assess(poorMetabolizer("acs_pci"));
    expect(result.status).toBe("matched");
    if (result.status !== "matched") return;
    expect(result.source.recommendationId).toBe(8480389);
    expect(result.cpicRecommendationVerbatim).toBe(
      "Avoid clopidogrel if possible. Use prasugrel or ticagrelor at standard dose if no contraindication.",
    );
    expect(result.alternatives).toEqual(["prasugrel", "ticagrelor"]);
    expect(result.doseTextPresent).toBe(false);
    expect(result.source.publicationPmid).toBe("35034351");
    expect(Object.keys(result.cpicImplicationsVerbatim)).toEqual(["CYP2C19"]);
    expect(result.cpicCommentsVerbatim.length).toBeGreaterThan(0);
  });

  it("marks the normal-metabolizer row as carrying source dose text, unchanged", () => {
    const result = assess({ ...poorMetabolizer("acs_pci"), geneResults: [
      { gene: "CYP2C19", diplotype: "*1/*1", phenotype: "Normal Metabolizer", source: "demo" },
    ] });
    expect(result.status).toBe("matched");
    if (result.status !== "matched") return;
    expect(result.source.recommendationId).toBe(8480385);
    expect(result.doseTextPresent).toBe(true);
    expect(result.cpicRecommendationVerbatim).toBe("If considering clopidogrel, use at standard dose (75 mg/day)");
    expect(result.alternatives).toEqual([]);
    expect(isPatientSafeText(result.patientText)).toBe(true);
    expect(result.patientText).not.toContain("75");
  });
});

describe("0.3 malformed snapshots throw at the module boundary", () => {
  const broken: [string, (copy: ReturnType<typeof clopidogrelSnapshotCopy>) => void, RegExp][] = [
    ["an unknown finding", (c) => { c.records[0].finding = "probably_fine"; }, /finding/],
    ["a missing verbatim recommendation", (c) => { delete c.records[0].cpicRecommendationVerbatim; }, /cpicRecommendationVerbatim/],
    ["a wrong dose flag", (c) => { c.records[0].doseTextPresent = true; }, /doseTextPresent/],
    ["an alternative CPIC does not name", (c) => { c.records[0].alternatives = ["aspirin"]; }, /not named/],
    ["patient text with a dose", (c) => { c.records[0].patientText = "Your result may mean 75mg is needed."; }, /patientText/],
    ["patient text with an action verb", (c) => { c.records[0].patientText = "Avoid this medicine."; }, /patientText/],
    ["a reviewed flag without a reviewer", (c) => { c.records[0].humanClinicalReview = true; }, /reviewedBy/],
    ["an Indeterminate lookup key", (c) => {
      c.records[0].lookupKey = { CYP2C19: "Indeterminate" };
      c.records[0].phenotypes = { CYP2C19: "Indeterminate" };
    }, /never produces guidance/],
    ["a schema version change", (c) => { c.schemaVersion = 1; }, /schemaVersion/],
  ];
  it.each(broken)("throws on %s", (_name, mutate, pattern) => {
    const copy = clopidogrelSnapshotCopy();
    mutate(copy);
    expect(() => parseGuidanceSnapshot(copy, "broken")).toThrow(pattern);
  });

  it("accepts the bundled snapshots", () => {
    expect(BUNDLED_GUIDANCE_SNAPSHOTS.length).toBeGreaterThan(0);
  });
});
