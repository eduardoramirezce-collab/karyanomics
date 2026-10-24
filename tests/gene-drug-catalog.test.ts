import { describe, expect, it } from "vitest";
import { findGeneDrugPairCandidates, listReportGeneCoverage } from "../lib/pgx/gene-drug-catalog";

describe("research-only gene–drug pair catalog", () => {
  it("covers exactly the eight agreed target genes", () => {
    const coverage = listReportGeneCoverage();
    expect(coverage.map((item) => item.gene)).toEqual([
      "ABCG2", "CYP2C19", "CYP2C9", "CYP4F2", "NUDT15", "SLCO1B1", "TPMT", "VKORC1",
    ]);
    expect(coverage.every((gene) => gene.personalizedGuidanceReady === false)).toBe(true);
    expect(coverage.every((gene) => gene.status === "source_pairs_found")).toBe(true);
  });

  it("keeps multi-gene guideline candidates together for a drug", () => {
    expect(findGeneDrugPairCandidates("warfarin").map((pair) => pair.gene))
      .toEqual(["CYP2C9", "CYP4F2", "VKORC1"]);
    expect(findGeneDrugPairCandidates("RxNorm:1256").map((pair) => pair.gene))
      .toEqual(["NUDT15", "TPMT"]);
    expect(findGeneDrugPairCandidates("warfarin").every((pair) => pair.status === "pair_metadata_only"))
      .toBe(true);
  });

  it("does not guess unknown drugs or identifiers", () => {
    expect(findGeneDrugPairCandidates("unknown drug")).toEqual([]);
    expect(findGeneDrugPairCandidates(" ")).toEqual([]);
  });
});
