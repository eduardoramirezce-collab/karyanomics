import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeVcf } from "../lib/pgx/analyzeVcf";
import { toMayaSampleAssessment } from "../lib/pgx/sample-assessment";
import { assessPatient } from "../lib/pgx/assess-patient";

describe("bundled Maya VCF to demo guidance", () => {
  const text = readFileSync(join(process.cwd(), "public/samples/maya.vcf"), "utf8");

  it("uses Kai's caller output, not a persona", () => {
    const { parsed, calls } = analyzeVcf(text);
    const input = toMayaSampleAssessment(parsed, calls);
    expect(input.geneResults[0]).toMatchObject({
      gene: "CYP2C19", diplotype: "*2/*2", phenotype: "Poor Metabolizer", source: "vcf",
    });
    expect(input.callStatus).toBe("complete");
    const result = assessPatient(input);
    expect(result.status).toBe("matched");
    if (result.status === "matched") expect(result.humanClinicalReview).toBe(false);
  });

  it("blocks an ambiguous call and a file warning", () => {
    const { parsed, calls } = analyzeVcf(text);
    const ambiguous = calls.map((call) => call.gene === "CYP2C19" ? { ...call, ambiguous: true } : call);
    expect(toMayaSampleAssessment(parsed, ambiguous).callStatus).toBe("incomplete");
    expect(toMayaSampleAssessment({ ...parsed, sampleCount: 2 }, calls).callStatus).toBe("incomplete");
  });

  it("makes all gene calls Indeterminate for a multi-sample VCF", () => {
    const twoSample = text.replace(/(#CHROM[^\n]+)\n/, "$1\tSECOND_SAMPLE\n");
    const { parsed, calls } = analyzeVcf(twoSample);
    expect(parsed.sampleCount).toBe(2);
    expect(calls.every((call) => call.diplotype === null)).toBe(true);
  });
});
