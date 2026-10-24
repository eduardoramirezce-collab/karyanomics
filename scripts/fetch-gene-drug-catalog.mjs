import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samples = ["alex", "maya", "sam"];
const reports = new Map();

for (const sample of samples) {
  const text = await readFile(join(root, "data", "samples", `${sample}.report.tsv`), "utf8");
  const [, header, ...lines] = text.trimEnd().split(/\r?\n/);
  if (!text.startsWith("PharmCAT 3.4.0\n")) throw new Error(`Unexpected PharmCAT version: ${sample}`);
  const columns = header.split("\t");
  const geneColumn = columns.indexOf("Gene");
  const diplotypeColumn = columns.indexOf("Source Diplotype");
  const phenotypeColumn = columns.indexOf("Phenotype");
  if ([geneColumn, diplotypeColumn, phenotypeColumn].some((index) => index < 0)) {
    throw new Error(`Required report columns missing: ${sample}`);
  }
  const genes = new Map();
  for (const line of lines) {
    const cells = line.split("\t");
    const gene = cells[geneColumn];
    if (!/^[A-Z0-9]+$/.test(gene) || genes.has(gene)) throw new Error(`Invalid/duplicate gene in ${sample}: ${gene}`);
    genes.set(gene, {
      diplotype: cells[diplotypeColumn] || null,
      phenotype: cells[phenotypeColumn]?.trim() || null,
    });
  }
  reports.set(sample, genes);
}

const scope = JSON.parse(await readFile(join(root, "data", "target-genes.v1.json"), "utf8"));
const allGenes = [...scope.genes].sort();
if (scope.schemaVersion !== 1 || new Set(allGenes).size !== allGenes.length ||
    samples.some((sample) => allGenes.some((gene) => !reports.get(sample).has(gene)))) {
  throw new Error("Target gene scope is invalid or absent from a sample report");
}
const endpoint = new URL("https://api.cpicpgx.org/v1/pair_view");
endpoint.searchParams.set("genesymbol", `in.(${allGenes.join(",")})`);
endpoint.searchParams.set("select", "genesymbol,drugid,drugname,guidelinename,guidelineurl,cpiclevel,usedforrecommendation,provisional");
endpoint.searchParams.set("limit", "1000");

const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`CPIC pair_view: HTTP ${response.status}`);
const sourceRows = await response.json();
if (!Array.isArray(sourceRows) || sourceRows.length >= 1000) {
  throw new Error("CPIC pair_view response missing or possibly truncated");
}

const rows = sourceRows.filter((row) =>
  allGenes.includes(row.genesymbol) &&
  row.usedforrecommendation === "Yes" &&
  row.provisional === false &&
  ["A", "B"].includes(row.cpiclevel),
);
const seenPairs = new Set();
const genes = allGenes.map((gene) => {
  const pairs = rows.filter((row) => row.genesymbol === gene).map((row) => {
    if (!/^RxNorm:\d+$/.test(row.drugid) || !row.drugname || !/^https:\/\//.test(row.guidelineurl)) {
      throw new Error(`Incomplete source identity for ${gene}`);
    }
    const key = [gene, row.drugid, row.guidelinename].join("|");
    if (seenPairs.has(key)) throw new Error(`Duplicate source pair: ${key}`);
    seenPairs.add(key);
    return {
      drug: row.drugname,
      rxnormId: row.drugid,
      guideline: row.guidelinename,
      guidelineUrl: row.guidelineurl,
      cpicLevel: row.cpiclevel,
      status: "pair_metadata_only",
    };
  }).sort((a, b) => a.drug.localeCompare(b.drug) || a.guideline.localeCompare(b.guideline));

  return {
    gene,
    sampleCalls: Object.fromEntries(samples.map((sample) => [sample, reports.get(sample).get(gene) ?? null])),
    pairs,
    status: pairs.length ? "source_pairs_found" : "no_current_cpic_a_b_pair",
    personalizedGuidanceReady: false,
  };
});

const catalog = {
  schemaVersion: 1,
  status: "research_index_not_clinical_guidance",
  fetchedAt: new Date().toISOString(),
  source: {
    name: "CPIC API pair_view",
    url: endpoint.toString(),
    usageTermsUrl: "https://www.clinpgx.org/page/dataUsagePolicy",
    usageTermsReviewPending: true,
  },
  sampleSource: "PharmCAT 3.4.0 synthetic reference reports",
  scopeSource: "data/target-genes.v1.json",
  inclusion: "Non-provisional CPIC A/B rows marked usedforrecommendation=Yes; a pair does not establish a patient-specific recommendation.",
  geneCount: genes.length,
  pairCount: rows.length,
  genes,
};

const destination = join(root, "data", "candidates");
await mkdir(destination, { recursive: true });
const output = join(destination, "cpic-gene-drug-catalog.json");
await writeFile(output, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Saved candidate: ${output}`);
console.log(`${catalog.geneCount} genes; ${catalog.pairCount} A/B source pairs; ${genes.filter((gene) => gene.pairs.length === 0).length} genes without a current A/B pair`);
