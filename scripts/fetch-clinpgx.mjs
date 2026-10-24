import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = "https://api.cpicpgx.org/v1";
const requests = [
  ["guideline", `${base}/guideline?name=eq.CYP2C19%20and%20Clopidogrel&select=*&limit=10`],
  ["pair", `${base}/pair_view?drugname=eq.clopidogrel&genesymbol=eq.CYP2C19&select=*&limit=10`],
  ["recommendations", `${base}/recommendation_view?drugname=eq.clopidogrel&guidelinename=eq.CYP2C19%20and%20Clopidogrel&select=*&limit=100`],
];

const result = {
  fetchedAt: new Date().toISOString(),
  status: "candidate_requires_human_review",
  source: "CPIC API",
  usageTermsUrl: "https://www.clinpgx.org/page/dataUsagePolicy",
  endpoints: Object.fromEntries(requests),
};

for (const [name, url] of requests) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`${name}: empty or unexpected response`);
  }
  result[name] = data;
  // ClinPGx requests clients to stay at or below two requests per second.
  await new Promise((resolve) => setTimeout(resolve, 600));
}

if (result.guideline.length !== 1 || result.pair.length !== 1) {
  throw new Error("Expected one CYP2C19/clopidogrel guideline and pair");
}
const destination = join(root, "data", "candidates");
await mkdir(destination, { recursive: true });
const output = join(destination, "cpic-cyp2c19-clopidogrel.json");
await writeFile(output, JSON.stringify(result, null, 2) + "\n");
console.log(`Saved candidate for human review: ${output}`);
console.log(`Guideline version: ${result.guideline[0].version}`);
console.log(`Recommendation rows: ${result.recommendations.length}`);
