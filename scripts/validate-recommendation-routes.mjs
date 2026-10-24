import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(await readFile(join(root, "data/cpic-recommendation-routes.v1.json"), "utf8"));
const catalog = JSON.parse(await readFile(join(root, "data/cpic-gene-drug-catalog.v1.json"), "utf8"));
const targetGenes = new Set(catalog.genes.map(({ gene }) => gene));
const blocked = new Set(["No Result", "Indeterminate", "n/a"]);
if (data.schemaVersion !== 1 || data.status !== "research_routing_only_not_patient_guidance" ||
    data.source?.usageTermsReviewPending !== true || data.routeCount !== data.routes.length ||
    data.guidelines.length !== 4 ||
    JSON.stringify(data).match(/"(?:patientText|clinicianSummary|dose|recommendationText)"\s*:/i)) {
  throw new Error("Research routing metadata is incomplete or contains clinical text");
}
const guidelines = new Map(data.guidelines.map((item) => [item.guidelineId, item]));
const warfarin = data.guidelines.find((item) => item.name === "CYP2C9, VKORC1, CYP4F2 and Warfarin");
if (!warfarin?.notesonusage?.includes("does not follow simple diplotype to phenotype translation") ||
    data.routes.some((route) => route.drug === "warfarin")) {
  throw new Error("Warfarin must remain an algorithm-only guideline");
}
const seen = new Set();
for (const route of data.routes) {
  const guideline = guidelines.get(route.guidelineId);
  if (!guideline || !Number.isInteger(guideline.version) || !Number.isInteger(route.recommendationId) ||
      seen.has(route.recommendationId) || !route.population || !route.classification ||
      !/^RxNorm:\d+$/.test(route.rxnormId) || !Object.keys(route.lookupKey).length) {
    throw new Error(`Incomplete or duplicate route: ${route.recommendationId}`);
  }
  seen.add(route.recommendationId);
  for (const [gene, value] of Object.entries(route.lookupKey)) {
    if (!targetGenes.has(gene) || blocked.has(value) || !value || typeof value !== "string" ||
        !route.phenotypes?.[gene]) {
      throw new Error(`Unusable lookup value: ${route.recommendationId} / ${gene}`);
    }
    const entry = catalog.genes.find((item) => item.gene === gene);
    if (!entry.pairs.some((pair) => pair.drug === route.drug &&
        pair.rxnormId === route.rxnormId && pair.guideline === guideline.name)) {
      throw new Error(`Route does not match CPIC pair catalog: ${route.recommendationId}`);
    }
  }
}
try {
  const candidate = JSON.parse(await readFile(join(root, "data/candidates/cpic-recommendation-index.json"), "utf8"));
  const current = new Map(candidate.rows.map((row) => [row.recommendationid, row]));
  for (const route of data.routes) {
    const row = current.get(route.recommendationId);
    if (!row || row.drugname !== route.drug || row.population.trim() !== route.population ||
        row.classification !== route.classification ||
        JSON.stringify(row.lookupkey) !== JSON.stringify(route.lookupKey) ||
        JSON.stringify(row.phenotypes) !== JSON.stringify(route.phenotypes)) {
      throw new Error(`Candidate source row changed: ${route.recommendationId}`);
    }
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.log("No candidate recommendation index found; checking bundled routes only.");
}
console.log(`Validated ${data.routeCount} research-only CPIC lookup rows across ${data.guidelines.length} guidelines.`);
