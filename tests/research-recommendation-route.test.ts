import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findResearchRecommendationRoute } from "../lib/pgx/research-recommendation-route";
import type { CallerEvidence } from "../lib/pgx/research-recommendation-route";
import type { DiplotypeCall } from "../lib/pgx/types";

const call = (gene: string, phenotype: string, activityScore: string | null = null): DiplotypeCall =>
  ({ gene, phenotype, diplotype: "synthetic/test", activityScore, ambiguous: false, source: "vcf" });
const proof = (gene: string): CallerEvidence => ({
  gene, genomeBuild: "GRCh38", coverage: "complete", quality: "pass",
  callerVersion: "test-caller", phenotypeTableVersion: "test-table",
});

describe("research-only phenotype to CPIC source-row routing", () => {
  it("selects an exact two-gene thiopurine row without publishing advice", () => {
    const result = findResearchRecommendationRoute({
      drug: "RxNorm:1256", population: "general",
      calls: [call("TPMT", "Normal Metabolizer"), call("NUDT15", "Intermediate Metabolizer")],
      evidence: [proof("TPMT"), proof("NUDT15")],
    });
    expect(result.status).toBe("source_row_for_clinician_review");
    if (result.status !== "source_row_for_clinician_review") return;
    expect(result.recommendationId).toBe(8480054);
    expect(result.requiredGenes).toEqual(["NUDT15", "TPMT"]);
    expect(result.clinicalReviewComplete).toBe(false);
    expect(result).not.toHaveProperty("recommendation");
    expect(result).not.toHaveProperty("dose");
  });

  it("requires both genes and rejects a fabricated or incomplete caller handoff", () => {
    const base = {
      drug: "azathioprine", population: "general",
      calls: [call("TPMT", "Normal Metabolizer"), call("NUDT15", "Intermediate Metabolizer")],
      evidence: [proof("TPMT"), proof("NUDT15")],
    };
    expect(findResearchRecommendationRoute({ ...base, calls: base.calls.slice(0, 1) }).status)
      .toBe("missing_gene_call");
    expect(findResearchRecommendationRoute({ ...base, evidence: [proof("TPMT")] }).status)
      .toBe("unverified_gene_call");
    expect(findResearchRecommendationRoute({
      ...base, evidence: [proof("TPMT"), { ...proof("NUDT15"), coverage: "incomplete" }],
    }).status).toBe("unverified_gene_call");
    expect(findResearchRecommendationRoute({
      ...base, calls: [call("TPMT", "Normal Metabolizer"),
        { ...call("NUDT15", "Intermediate Metabolizer"), source: "lab-report" }],
    }).status).toBe("unverified_gene_call");
    expect(findResearchRecommendationRoute({
      ...base, calls: [call("TPMT", "Normal Metabolizer"),
        { ...call("NUDT15", "Intermediate Metabolizer"), ambiguous: true }],
    }).status).toBe("unverified_gene_call");
  });

  it("uses the exact indication for clopidogrel and rejects a missing context", () => {
    const base = {
      drug: "clopidogrel", population: "CVI ACS PCI",
      calls: [call("CYP2C19", "Poor Metabolizer")], evidence: [proof("CYP2C19")],
    };
    const result = findResearchRecommendationRoute(base);
    expect(result.status).toBe("source_row_for_clinician_review");
    if (result.status === "source_row_for_clinician_review") {
      expect(result.recommendationId).toBe(8480389);
    }
    expect(findResearchRecommendationRoute({ ...base, population: null }).status).toBe("context_required");
    expect(findResearchRecommendationRoute({ ...base, population: "general" }).status)
      .toBe("context_not_indexed");
  });

  it("requires a CYP2C9 activity score for fluvastatin and both genes for rosuvastatin", () => {
    const fluvastatin = {
      drug: "fluvastatin", population: "general",
      calls: [call("SLCO1B1", "Normal Function"), call("CYP2C9", "Normal Metabolizer")],
      evidence: [proof("SLCO1B1"), proof("CYP2C9")],
    };
    expect(findResearchRecommendationRoute(fluvastatin).status).toBe("activity_score_required");
    expect(findResearchRecommendationRoute({ ...fluvastatin,
      calls: [call("SLCO1B1", "Normal Function"), call("CYP2C9", "Normal Metabolizer", "2")],
    }).status)
      .toBe("source_row_for_clinician_review");
    expect(findResearchRecommendationRoute({
      ...fluvastatin,
      calls: [call("SLCO1B1", "Normal Function"), call("CYP2C9", "Poor Metabolizer", "2")],
    }).status).toBe("no_exact_source_row");
    expect(findResearchRecommendationRoute({
      drug: "rosuvastatin", population: "general",
      calls: [call("SLCO1B1", "Normal Function")], evidence: [proof("SLCO1B1")],
    }).status).toBe("missing_gene_call");
  });

  it("keeps warfarin in its guideline algorithm and other pairs unindexed", () => {
    const warfarin = findResearchRecommendationRoute({
      drug: "warfarin", population: "general", calls: [], evidence: [],
    });
    expect(warfarin.status).toBe("guideline_algorithm_required");
    expect(warfarin.requiredGenes).toEqual(["CYP2C9", "CYP4F2", "VKORC1"]);
    expect(findResearchRecommendationRoute({
      drug: "omeprazole", population: "general", calls: [], evidence: [],
    }).status).toBe("source_rows_not_indexed");
    expect(findResearchRecommendationRoute({
      drug: "unknown drug", population: "general", calls: [], evidence: [],
    }).status).toBe("unsupported_drug");
  });

  it("matches PharmCAT sample vocabulary and activity score at the fixture handoff", () => {
    const lines = readFileSync(join(process.cwd(), "data/samples/maya.report.tsv"), "utf8")
      .trimEnd().split(/\r?\n/);
    const headers = lines[1].split("\t");
    const records = new Map(lines.slice(2).map((line) => {
      const cells = line.split("\t");
      return [cells[0], Object.fromEntries(headers.map((header, index) => [header, cells[index]]))];
    }));
    const fixtureCall = (gene: string): DiplotypeCall => {
      const row = records.get(gene)!;
      return { gene, diplotype: row["Source Diplotype"],
        phenotype: row["Phenotype"], activityScore: row["Activity Score"] === "n/a" ? null : row["Activity Score"], ambiguous: false, source: "vcf" };
    };
    const thiopurine = findResearchRecommendationRoute({
      drug: "azathioprine", population: "general",
      calls: [fixtureCall("TPMT"), fixtureCall("NUDT15")],
      evidence: [proof("TPMT"), proof("NUDT15")],
    });
    expect(thiopurine.status).toBe("source_row_for_clinician_review");
    if (thiopurine.status === "source_row_for_clinician_review") {
      expect(thiopurine.recommendationId).toBe(8480053);
    }
    const fluvastatin = findResearchRecommendationRoute({
      drug: "fluvastatin", population: "general",
      calls: [fixtureCall("SLCO1B1"), fixtureCall("CYP2C9")],
      evidence: [proof("SLCO1B1"), proof("CYP2C9")],
    });
    expect(fluvastatin.status).toBe("source_row_for_clinician_review");
    // These are reference report values, not calls made from Maya's VCF by this app.
  });
});
