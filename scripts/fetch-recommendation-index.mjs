import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(join(root, "data", "cpic-gene-drug-catalog.v1.json"), "utf8"));
const guidelines = [...new Set(catalog.genes.flatMap(({ pairs }) => pairs.map(({ guideline }) => guideline)))].sort();
const rows = [];
const endpoints = [];

for (const guideline of guidelines) {
  for (let offset = 0; offset < 20_000; offset += 1000) {
    const endpoint = new URL("https://api.cpicpgx.org/v1/recommendation_view");
    endpoint.searchParams.set("guidelinename", `eq.${guideline}`);
    endpoint.searchParams.set("select", "recommendationid,lookupkey,drugname,guidelinename,guidelineurl,classification,phenotypes,population");
    endpoint.searchParams.set("limit", "1000");
    endpoint.searchParams.set("offset", String(offset));
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`${guideline}: HTTP ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result)) throw new Error(`${guideline}: unexpected response`);
    endpoints.push(endpoint.toString());
    rows.push(...result);
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (result.length < 1000) break;
    if (offset === 19_000) throw new Error(`${guideline}: pagination cap reached`);
  }
}

const index = {
  schemaVersion: 1,
  status: "candidate_requires_human_review",
  fetchedAt: new Date().toISOString(),
  source: "CPIC API recommendation_view",
  usageTermsUrl: "https://www.clinpgx.org/page/dataUsagePolicy",
  endpoints,
  rowCount: rows.length,
  rows: rows.sort((a, b) => a.guidelinename.localeCompare(b.guidelinename) ||
    a.drugname.localeCompare(b.drugname) || a.recommendationid - b.recommendationid),
};
const destination = join(root, "data", "candidates");
await mkdir(destination, { recursive: true });
const output = join(destination, "cpic-recommendation-index.json");
await writeFile(output, JSON.stringify(index, null, 2) + "\n");
console.log(`Saved candidate: ${output}`);
console.log(`${guidelines.length} guidelines; ${rows.length} source recommendation rows.`);
