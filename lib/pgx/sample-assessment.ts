import type { ClinicalAssessmentInput, DiplotypeCall, ParsedVcf } from "./types";

/** Demo-only handoff for the bundled Maya fixture; never use for uploaded files. */
export function toMayaSampleAssessment(
  parsed: ParsedVcf,
  calls: DiplotypeCall[],
): ClinicalAssessmentInput {
  const matches = calls.filter((call) => call.gene === "CYP2C19");
  const call = matches[0];
  const complete = parsed.genomeBuild === "GRCh38" && parsed.sampleCount === 1 &&
    parsed.skippedLines.length === 0 && parsed.warnings.length === 0 &&
    matches.length === 1 && call.source === "vcf" && !!call.diplotype &&
    !!call.phenotype && call.phenotype !== "Indeterminate" && !call.ambiguous &&
    parsed.variants.every((variant) => variant.filter === "PASS" || variant.filter === null);
  return {
    geneResults: call ? [{
      gene: call.gene,
      diplotype: call.diplotype,
      phenotype: call.phenotype ?? "Indeterminate",
      source: call.source,
      ambiguous: call.ambiguous,
    }] : [],
    drug: "clopidogrel",
    context: "acs_pci",
    callStatus: complete ? "complete" : "incomplete",
  };
}
