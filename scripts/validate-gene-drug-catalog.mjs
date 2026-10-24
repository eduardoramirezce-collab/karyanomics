import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(join(root, "data", "cpic-gene-drug-catalog.v1.json"), "utf8"));
const scope = JSON.parse(await readFile(join(root, "data", "target-genes.v1.json"), "utf8"));
const samples = ["alex", "maya", "sam"];
const reportGenes = new Set();
for (const sample of samples) {
  const lines = (await readFile(join(root, "data", "samples", `${sample}.report.tsv`), "utf8"))
    .trimEnd().split(/\r?\n/).slice(2);
  for (const line of lines) reportGenes.add(line.split("\t")[0]);
}
if (scope.schemaVersion !== 1 || scope.genes.length !== 8 || new Set(scope.genes).size !== 8 ||
    scope.genes.some((gene) => !reportGenes.has(gene)) ||
    catalog.schemaVersion !== 1 || catalog.status !== "research_index_not_clinical_guidance" ||
    catalog.source.usageTermsReviewPending !== true ||
    catalog.geneCount !== catalog.genes.length || catalog.geneCount !== scope.genes.length) {
  throw new Error("Catalog metadata or gene coverage does not match the eight-gene scope");
}

const seenGenes = new Set();
let count = 0;
for (const entry of catalog.genes) {
  if (!scope.genes.includes(entry.gene) || seenGenes.has(entry.gene) || entry.personalizedGuidanceReady !== false) {
    throw new Error(`Missing, duplicate, or actionable gene entry: ${entry.gene}`);
  }
  seenGenes.add(entry.gene);
  if (entry.status !== (entry.pairs.length ? "source_pairs_found" : "no_current_cpic_a_b_pair")) {
    throw new Error(`Incorrect pair status: ${entry.gene}`);
  }
  if (samples.some((sample) => !(sample in entry.sampleCalls))) {
    throw new Error(`Missing sample call: ${entry.gene}`);
  }
  const seenPairs = new Set();
  for (const pair of entry.pairs) {
    const key = [pair.rxnormId, pair.guideline].join("|");
    if (seenPairs.has(key) || !/^RxNorm:\d+$/.test(pair.rxnormId) ||
        !["A", "B"].includes(pair.cpicLevel) || pair.status !== "pair_metadata_only" ||
        !pair.guidelineUrl.startsWith("https://www.clinpgx.org/guideline/")) {
      throw new Error(`Invalid pair metadata: ${entry.gene} / ${pair.drug}`);
    }
    seenPairs.add(key);
    count++;
  }
}
if (count !== catalog.pairCount) throw new Error("Catalog pair count is inconsistent");
console.log(`Validated research-only catalog: ${catalog.geneCount} genes, ${count} CPIC A/B pairs.`);
