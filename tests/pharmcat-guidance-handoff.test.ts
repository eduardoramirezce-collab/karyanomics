import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assess } from "../lib/pgx/assess";

/** Read the CYP2C19 row from Kai's PharmCAT reference output, not from our VCF caller. */
function referenceCall(sample: string) {
  const text = readFileSync(join(process.cwd(), "data", "samples", `${sample}.report.tsv`), "utf8");
  const [, header, ...rows] = text.trimEnd().split(/\r?\n/);
  const columns = header.split("\t");
  const geneIndex = columns.indexOf("Gene");
  const diplotypeIndex = columns.indexOf("Source Diplotype");
  const phenotypeIndex = columns.indexOf("Phenotype");
  const row = rows.map((line) => line.split("\t")).find((cells) => cells[geneIndex] === "CYP2C19");
  if (!row || geneIndex < 0 || diplotypeIndex < 0 || phenotypeIndex < 0) {
    throw new Error(`CYP2C19 reference row missing for ${sample}`);
  }
  return { gene: "CYP2C19", diplotype: row[diplotypeIndex], phenotype: row[phenotypeIndex], source: "demo" as const };
}

describe("PharmCAT reference output → CPIC guidance vocabulary", () => {
  it.each([
    ["maya", "*2/*2", "Poor Metabolizer", 8480389],
    ["alex", "*38/*38", "Normal Metabolizer", 8480385],
    ["sam", "*38/*38", "Normal Metabolizer", 8480385],
  ] as const)("matches the synthetic %s reference phenotype", (sample, diplotype, phenotype, recommendationId) => {
    const call = referenceCall(sample);
    expect(call.diplotype).toBe(diplotype);
    expect(call.phenotype).toBe(phenotype);

    const result = assess({
      geneResults: [call],
      drug: "RxNorm:32968",
      context: "acs_pci",
      callStatus: "complete",
    });
    expect(result.status).toBe("matched");
    if (result.status === "matched") {
      expect(result.source.recommendationId).toBe(recommendationId);
      expect(result.humanClinicalReview).toBe(false);
    }
  });
});
