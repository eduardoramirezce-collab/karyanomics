import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const candidate = JSON.parse(await readFile(join(root, "data/candidates/cpic-recommendation-index.json"), "utf8"));
const catalog = JSON.parse(await readFile(join(root, "data/cpic-gene-drug-catalog.v1.json"), "utf8"));
const selectedGuidelines = [
  "CYP2C19 and Clopidogrel",
  "SLCO1B1, ABCG2, CYP2C9, and Statins",
  "TPMT, NUDT15 and Thiopurines",
  "CYP2C9, VKORC1, CYP4F2 and Warfarin",
];
const blockedLookupValues = new Set(["No Result", "Indeterminate", "n/a"]);
const rows = candidate.rows.filter((row) =>
  selectedGuidelines.includes(row.guidelinename) &&
  Object.keys(row.lookupkey ?? {}).length > 0 &&
  Object.values(row.lookupkey).every((value) => typeof value === "string" && !blockedLookupValues.has(value)),
);
const guidelines = [];
for (const name of selectedGuidelines) {
  const endpoint = new URL("https://api.cpicpgx.org/v1/guideline");
  endpoint.searchParams.set("name", `eq.${name}`);
  endpoint.searchParams.set("select", "name,version,url,clinpgxid,genes,notesonusage");
  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${name}: guideline HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length !== 1 || !Number.isInteger(data[0].version)) {
    throw new Error(`${name}: expected one versioned guideline`);
  }
  guidelines.push(data[0]);
  await new Promise((resolve) => setTimeout(resolve, 600));
}
const warfarin = guidelines.find((item) => item.name === "CYP2C9, VKORC1, CYP4F2 and Warfarin");
if (!warfarin?.notesonusage?.includes("does not follow simple diplotype to phenotype translation")) {
  throw new Error("Warfarin must remain an algorithm-based guideline, not a simple route");
}

const seen = new Set();
const routes = rows.map((row) => {
  if (seen.has(row.recommendationid)) throw new Error(`Duplicate recommendation: ${row.recommendationid}`);
  seen.add(row.recommendationid);
  const guideline = guidelines.find((item) => item.name === row.guidelinename);
  if (!guideline || row.guidelineurl !== guideline.url) throw new Error(`Guideline mismatch: ${row.recommendationid}`);
  const pairs = catalog.genes.flatMap(({ gene, pairs }) => pairs.filter(
    (pair) => pair.drug === row.drugname && pair.guideline === row.guidelinename,
  ).map((pair) => ({ gene, pair })));
  if (!pairs.length || Object.keys(row.lookupkey).some((gene) => !pairs.some((item) => item.gene === gene))) {
    throw new Error(`Pair or lookup gene missing: ${row.recommendationid}`);
  }
  if (Object.keys(row.lookupkey).some((gene) => !row.phenotypes?.[gene])) {
    throw new Error(`Phenotype vocabulary missing: ${row.recommendationid}`);
  }
  const rxnormIds = [...new Set(pairs.map((item) => item.pair.rxnormId))];
  if (rxnormIds.length !== 1 || !row.population || !row.classification) {
    throw new Error(`Route identity missing: ${row.recommendationid}`);
  }
  return {
    recommendationId: row.recommendationid,
    guidelineId: guideline.clinpgxid,
    drug: row.drugname,
    rxnormId: rxnormIds[0],
    population: row.population.trim(),
    lookupKey: row.lookupkey,
    phenotypes: row.phenotypes,
    classification: row.classification,
  };
}).sort((a, b) => a.drug.localeCompare(b.drug) ||
  a.population.localeCompare(b.population) || a.recommendationId - b.recommendationId);

const result = {
  schemaVersion: 1,
  status: "research_routing_only_not_patient_guidance",
  fetchedAt: candidate.fetchedAt,
  builtAt: new Date().toISOString(),
  source: {
    name: "CPIC API recommendation_view and guideline",
    url: "https://api.cpicpgx.org/v1/",
    usageTermsUrl: "https://www.clinpgx.org/page/dataUsagePolicy",
    usageTermsReviewPending: true,
  },
  exclusion: "No Result, Indeterminate, and n/a lookup values excluded; no recommendation text or dose is stored.",
  guidelines: guidelines.map(({ name, version, url, clinpgxid, genes, notesonusage }) =>
    ({ name, version, url, guidelineId: clinpgxid, genes, notesonusage })),
  routeCount: routes.length,
  routes,
};
const destination = join(root, "data", "candidates");
await mkdir(destination, { recursive: true });
const output = join(destination, "cpic-recommendation-routes.json");
await writeFile(output, JSON.stringify(result, null, 2) + "\n");
console.log(`Saved research-only candidate: ${output}`);
console.log(`${guidelines.length} guidelines; ${routes.length} exact source lookup rows without recommendation text.`);
