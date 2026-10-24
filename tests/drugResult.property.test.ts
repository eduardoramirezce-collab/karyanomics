import { readFileSync } from "node:fs";
import { join } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { analyzeVcf } from "../lib/pgx/analyzeVcf";
import { listDrugTherapeuticGroups } from "../lib/pgx/drug-therapeutic-groups";
import {
  buildDrugResult,
  CPIC_CLASSIFICATIONS,
  DISPLAY_STATUSES,
  GENERIC_PRESCRIBER_LINE,
  STATUS_LEVEL,
  type ResultSource,
} from "../lib/pgx/drugResult";
import type { DiplotypeCall } from "../lib/pgx/types";

const sampleIds = ["maya", "alex", "sam"] as const;
const samples = sampleIds.map((id) => ({
  id,
  ...analyzeVcf(readFileSync(join(process.cwd(), `public/samples/${id}.vcf`), "utf8")),
}));
const drugs = listDrugTherapeuticGroups().flatMap((group) => group.drugs);

const genes = ["CYP2C19", "CYP2C9", "VKORC1", "CYP4F2", "SLCO1B1", "ABCG2", "TPMT", "NUDT15", "CYP2D6", "HLA-B"];
const phenotypes = [
  "Normal Metabolizer", "Normal Function", "Poor Metabolizer", "Intermediate Metabolizer",
  "Rapid Metabolizer", "Decreased Function", "Poor Function", "Indeterminate", "No Result", "n/a", null,
];
const callArb: fc.Arbitrary<DiplotypeCall> = fc.record({
  gene: fc.constantFrom(...genes),
  diplotype: fc.option(fc.constantFrom("*1/*1", "*1/*2", "*2/*2", "*38/*38", "*1/*5"), { nil: null }),
  phenotype: fc.constantFrom(...phenotypes),
  activityScore: fc.option(fc.constantFrom("0.0", "1.0", "1.5", "2.0"), { nil: null }),
  source: fc.constantFrom("vcf" as const, "outside-call" as const, "demo" as const),
  ambiguous: fc.boolean(),
});
const sampleArb = fc.constantFrom(...samples);
const drugArb = fc.constantFrom(...drugs);
const roleArb = fc.constantFrom("patient" as const, "clinician" as const);

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("drugResult properties", () => {
  it("has drugs and classifications to check", () => {
    expect(drugs.length).toBeGreaterThan(0);
    expect(CPIC_CLASSIFICATIONS.length).toBeGreaterThan(0);
  });

  // Feature: portal-frontend, Property 1: Every drug gets exactly one of four statuses, without throwing
  it("every sample, role, and drug gets one of four statuses without throwing", () => {
    for (const sample of samples) for (const role of ["patient", "clinician"] as const) for (const entry of drugs) {
      for (const source of [{ kind: "sample", id: sample.id }, { kind: "upload" }] as ResultSource[]) {
        const result = buildDrugResult({ drug: entry, role, source, parsed: sample.parsed, calls: sample.calls });
        expect(DISPLAY_STATUSES).toContain(result.status);
        expect(result.level).toBe(STATUS_LEVEL[result.status]);
      }
    }
    fc.assert(fc.property(sampleArb, drugArb, roleArb, fc.boolean(), fc.array(callArb, { maxLength: 14 }),
      (sample, entry, role, upload, calls) => {
        const result = buildDrugResult({
          drug: entry, role, source: upload ? { kind: "upload" } : { kind: "sample", id: sample.id },
          parsed: sample.parsed, calls,
        });
        expect(DISPLAY_STATUSES.filter((status) => status === result.status)).toHaveLength(1);
        // Feature: portal-frontend, Property 2: Steering level always matches the status
        expect(result.level).toBe(STATUS_LEVEL[result.status]);
      }), { numRuns: 200 });
  });

  // Feature: portal-frontend, Property 3: Patient output is free of clinician detail and dosing words
  it("patient output never contains stop, dose, mg, or CPIC classification text", () => {
    const banned = ["stop", "dose", "mg", ...CPIC_CLASSIFICATIONS.map((value) => value.toLowerCase())];
    fc.assert(fc.property(sampleArb, drugArb, fc.boolean(), (sample, entry, upload) => {
      const result = buildDrugResult({
        drug: entry, role: "patient", source: upload ? { kind: "upload" } : { kind: "sample", id: sample.id },
        parsed: sample.parsed, calls: sample.calls,
      });
      for (const key of ["diplotype", "activityScore", "ambiguous", "classification", "recommendationId", "guidelineVersion", "routeRows"]) {
        expect(JSON.stringify(result)).not.toContain(`"${key}"`);
      }
      for (const text of strings(result)) {
        for (const word of banned) expect(text.toLowerCase()).not.toContain(word);
      }
    }), { numRuns: 300 });
    // Exhaustive pass so every sample × drug combination is checked at least once.
    for (const sample of samples) for (const entry of drugs) {
      const result = buildDrugResult({ drug: entry, role: "patient", source: { kind: "sample", id: sample.id }, parsed: sample.parsed, calls: sample.calls });
      for (const text of strings(result)) for (const word of banned) expect(text.toLowerCase()).not.toContain(word);
    }
  });

  // Feature: portal-frontend, Property 6: Uploads never receive assessPatient text
  it("uploads always get the generic prescriber line", () => {
    fc.assert(fc.property(sampleArb, drugArb, roleArb, (sample, entry, role) => {
      const result = buildDrugResult({ drug: entry, role, source: { kind: "upload" }, parsed: sample.parsed, calls: sample.calls });
      expect(result.guidanceLine).toBe(GENERIC_PRESCRIBER_LINE);
      expect(result.conditionLabel).toBeNull();
    }), { numRuns: 100 });
  });
});
