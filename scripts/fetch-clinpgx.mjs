/**
 * Build-time only: fetch a CPIC candidate for every configured gene–drug pair.
 *
 * Writes data/candidates/cpic-<slug>.json (gitignored). It never touches a
 * curated snapshot; promote-cpic-candidate.mjs copies rows only when a person
 * runs it. Requests stay at or below two per second, as ClinPGx asks.
 *
 * Usage: npm run fetch:clinpgx [-- <slug> ...]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GUIDANCE, USAGE_TERMS_URL, guidanceBySlug } from "./lib/guidance-config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = "https://api.cpicpgx.org/v1";
const selected = process.argv.slice(2).length ? process.argv.slice(2).map(guidanceBySlug) : GUIDANCE;

let lastRequest = 0;
async function getRows(name, url, { allowEmpty = false } = {}) {
  const wait = Math.max(0, 600 - (Date.now() - lastRequest));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequest = Date.now();
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status} for ${url}`);
  const data = await response.json();
  if (!Array.isArray(data) || (!allowEmpty && data.length === 0)) {
    throw new Error(`${name}: empty or unexpected response for ${url}`);
  }
  return data;
}

for (const entry of selected) {
  const guidelineName = encodeURIComponent(entry.guidelineName);
  const drug = encodeURIComponent(entry.drug);
  const endpoints = {
    guideline: `${base}/guideline?name=eq.${guidelineName}&select=*&limit=10`,
    pair: `${base}/pair_view?drugname=eq.${drug}&guidelinename=eq.${guidelineName}&select=*&limit=50`,
    drug: `${base}/drug?name=eq.${drug}&select=*&limit=10`,
    recommendations: `${base}/recommendation_view?drugname=eq.${drug}&guidelinename=eq.${guidelineName}&select=*&limit=1000`,
  };
  const result = {
    fetchedAt: new Date().toISOString(),
    status: "candidate_requires_human_review",
    source: "CPIC API",
    usageTermsUrl: USAGE_TERMS_URL,
    slug: entry.slug,
    endpoints,
  };
  result.guideline = await getRows("guideline", endpoints.guideline);
  result.pair = await getRows("pair", endpoints.pair);
  result.drug = await getRows("drug", endpoints.drug);
  result.recommendations = await getRows("recommendations", endpoints.recommendations,
    { allowEmpty: !entry.expectRecommendations });
  if (result.guideline.length !== 1 || result.drug.length !== 1) {
    throw new Error(`${entry.slug}: expected exactly one guideline and one drug row`);
  }
  endpoints.publications = `${base}/publication?guidelineid=eq.${result.guideline[0].id}&select=*&order=year.desc`;
  result.publications = await getRows("publications", endpoints.publications);
  if (result.recommendations.length > 999) throw new Error(`${entry.slug}: pagination cap reached`);

  const destination = join(root, entry.candidatePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(result, null, 2) + "\n");
  console.log(`${entry.slug}: guideline v${result.guideline[0].version}, ${result.recommendations.length} rows → ${entry.candidatePath}`);
}
console.log("Candidates are for human review. Curated snapshots were not changed.");
