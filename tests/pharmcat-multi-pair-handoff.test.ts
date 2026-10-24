/**
 * PharmCAT 3.4.0 reference reports (Kai's answer keys) → assess() for every
 * curated pair. Inputs are the real fixture rows, not invented calls.
 * Expected rec IDs were read from the live CPIC API on 2026-10-24.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assess, BUNDLED_GUIDANCE_SNAPSHOTS } from "../lib/pgx/assess";
import { assessPatient } from "../lib/pgx/assess-patient";
import { doseFragments } from "../lib/pgx/dose-text";
import { isPatientSafeText } from "../lib/pgx/patient-text-guard";
import type { ClinicalContext } from "../lib/pgx/types";
import { GUIDANCE } from "../scripts/lib/guidance-config.mjs";
import { referenceCall } from "./helpers/guidance";

type Sample = "maya" | "alex" | "sam";
const run = (sample: Sample, genes: string[], drug: string, context: ClinicalContext) =>
  assess({ geneResults: genes.map((gene) => referenceCall(sample, gene)), drug, context, callStatus: "complete" });

describe("PharmCAT reference phenotypes → exact CPIC rows", () => {
  it.each([
    // [sample, genes, drug, context, expected rec ID]
    ["maya", ["CYP2C19"], "clopidogrel", "acs_pci", 8480389],
    ["maya", ["CYP2C19"], "clopidogrel", "non_acs_pci", 8480397],
    ["maya", ["CYP2C19"], "clopidogrel", "neurovascular", 8480405],
    ["alex", ["CYP2C19"], "clopidogrel", "non_acs_pci", 8480393],
    ["alex", ["CYP2C19"], "clopidogrel", "neurovascular", 8480401],
    ["maya", ["SLCO1B1"], "simvastatin", "general", 8481445],
    ["sam", ["SLCO1B1"], "simvastatin", "general", 8481447],
    ["alex", ["TPMT", "NUDT15"], "azathioprine", "general", 8480053],
    ["alex", ["DPYD"], "fluorouracil", "general", 8480742],
    ["alex", ["DPYD"], "capecitabine", "general", 8480747],
    ["maya", ["CYP2C19"], "citalopram", "general", 8480167],
    ["alex", ["CYP2C19"], "citalopram", "general", 8480163],
  ] as const)("%s %j + %s (%s) → %i", (sample, genes, drug, context, id) => {
    const result = run(sample, [...genes], drug, context);
    expect(result.status).toBe("matched");
    if (result.status !== "matched") return;
    expect(result.source.recommendationId).toBe(id);
    expect(result.context).toBe(context);
    expect(result.humanClinicalReview).toBe(false);
    expect(isPatientSafeText(result.patientText)).toBe(true);
  });

  it.each(["maya", "alex", "sam"] as const)("%s matches one row for every multi-gene pair", (sample) => {
    for (const [genes, drug] of [[["TPMT", "NUDT15"], "mercaptopurine"], [["CYP2C19", "CYP2B6"], "sertraline"],
      [["CYP2C19"], "escitalopram"]] as const) {
      const result = run(sample, [...genes], drug, "general");
      expect(result.status).toBe("matched");
      if (result.status === "matched") expect(result.genes).toEqual([...genes].sort());
    }
  });

  it("carries CPIC's lower strength for the same phenotype in other indications", () => {
    const strengths = (["acs_pci", "non_acs_pci", "neurovascular"] as const).map((context) => {
      const result = run("maya", ["CYP2C19"], "clopidogrel", context);
      return result.status === "matched" ? result.strength : result.status;
    });
    expect(strengths).toEqual(["Strong", "Moderate", "Moderate"]);
  });

  it("returns insufficient data, not a neighbouring row, when CPIC makes no recommendation", () => {
    const result = assess({ geneResults: [{ gene: "CYP2C19", diplotype: "*1/*17", phenotype: "Rapid Metabolizer", source: "demo" }],
      drug: "clopidogrel", context: "neurovascular", callStatus: "complete" });
    expect(result).toEqual({ status: "insufficient_data", reason: "source_no_recommendation", recommendationId: 8480400 });
  });

  it("requires every gene of a multi-gene guideline", () => {
    expect(run("alex", ["TPMT"], "azathioprine", "general").status).toBe("indeterminate");
    expect(run("alex", ["CYP2C19"], "sertraline", "general").status).toBe("indeterminate");
  });

  it("requires the activity score for DPYD", () => {
    const call = { ...referenceCall("alex", "DPYD"), activityScore: null };
    expect(assess({ geneResults: [call], drug: "fluorouracil", context: "general", callStatus: "complete" }).status)
      .toBe("insufficient_data");
  });
});

describe("warfarin: reference the algorithm, never a dose", () => {
  it.each(["maya", "alex", "sam"] as const)("%s → dosing_algorithm_required with no dose anywhere", (sample) => {
    const result = run(sample, ["CYP2C9", "VKORC1", "CYP4F2"], "warfarin", "general");
    expect(result.status).toBe("insufficient_data");
    if (result.status === "matched") return;
    expect(result.reason).toBe("dosing_algorithm_required");
    expect(result.dosingAlgorithmReference?.clinicianMustUseAlgorithmDirectly).toBe(true);
    expect(result.dosingAlgorithmReference?.pmid).toBe("28198005");
    expect(doseFragments(JSON.stringify(result))).toEqual([]);
    const patient = assessPatient({ geneResults: [], drug: "warfarin", context: "general", callStatus: "complete" });
    expect(patient.status).toBe("insufficient_data");
  });
});

// Live-data drift check: each case runs only after `npm run fetch:clinpgx` (data/candidates/ is gitignored).
describe("Stage 4: every dose string is copied from its CPIC source", () => {
  const verbatimSource: Record<string, (row: Record<string, unknown>) => string[]> = {
    cpicRecommendationVerbatim: (row) => [row.drugrecommendation as string],
    cpicCommentsVerbatim: (row) => [row.comments as string],
    cpicImplicationsVerbatim: (row) => Object.values((row.implications ?? {}) as Record<string, string>),
  };
  it.for(GUIDANCE.map((entry) => [entry.slug, entry.candidatePath] as const))("%s", ([slug, candidatePath], { skip }) => {
    const path = join(process.cwd(), candidatePath);
    if (!existsSync(path)) return skip(`No live candidate at ${candidatePath}. Run \`npm run fetch:clinpgx\` to check this snapshot against CPIC.`);
    const candidate = JSON.parse(readFileSync(path, "utf8")) as { recommendations: Record<string, unknown>[] };
    const snapshot = BUNDLED_GUIDANCE_SNAPSHOTS.find((item) => item.snapshotId.startsWith(`cpic-${slug}-`))!;
    for (const record of snapshot.records) {
      const row = candidate.recommendations.find((item) => item.recommendationid === record.sourceRecommendationId)!;
      expect(record.cpicRecommendationVerbatim).toBe(row.drugrecommendation);
      for (const [field, value] of Object.entries(record)) {
        const fragments = doseFragments(JSON.stringify(value));
        if (!fragments.length) continue;
        expect(verbatimSource[field], `dose text outside a verbatim field: ${field}`).toBeDefined();
        for (const fragment of fragments) {
          expect(verbatimSource[field](row).some((source) => source.includes(fragment))).toBe(true);
        }
      }
    }
  });
});

describe("registry", () => {
  it("assess() bundles exactly the configured snapshots", () => {
    expect(BUNDLED_GUIDANCE_SNAPSHOTS.map((s) => s.pair.drug).sort()).toEqual(GUIDANCE.map((g) => g.drug).sort());
  });
  it("does not add CYP2D6", () => {
    expect(BUNDLED_GUIDANCE_SNAPSHOTS.flatMap((s) => s.pair.genes)).not.toContain("CYP2D6");
  });
});
