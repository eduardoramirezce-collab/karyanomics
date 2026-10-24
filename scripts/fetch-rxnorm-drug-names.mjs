import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(await readFile(join(root, "data/cpic-gene-drug-catalog.v1.json"), "utf8"));
const ingredients = new Map();
for (const entry of source.genes) {
  for (const pair of entry.pairs) {
    const previous = ingredients.get(pair.rxnormId);
    if (previous && previous !== pair.drug) throw new Error(`Conflicting CPIC ingredient: ${pair.rxnormId}`);
    ingredients.set(pair.rxnormId, pair.drug);
  }
}

const base = "https://rxnav.nlm.nih.gov/REST";
const prescribeBase = `${base}/Prescribe`;
let lastRequest = 0;
async function getJson(path) {
  // Conservative spacing: 2 requests/second, below the NLM 20/s/IP limit.
  const wait = Math.max(0, 600 - (Date.now() - lastRequest));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequest = Date.now();
  const response = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`RxNorm ${path}: HTTP ${response.status}`);
  return response.json();
}

const version = await getJson("/version.json");
if (!version.version || !version.apiVersion) throw new Error("Missing RxNorm source version");
const drugs = [];

for (const [rxnormId, genericName] of [...ingredients].sort((a, b) => a[1].localeCompare(b[1]))) {
  const id = rxnormId.replace(/^RxNorm:/, "");
  const prescribableProperties = (await getJson(`/Prescribe/rxcui/${id}/properties.json`)).properties;
  const properties = prescribableProperties ?? (await getJson(`/rxcui/${id}/properties.json`)).properties;
  if (properties?.rxcui !== id || properties.tty !== "IN" || properties.suppress !== "N" ||
      properties.name.toLowerCase() !== genericName.toLowerCase()) {
    throw new Error(`CPIC/RxNorm ingredient identity mismatch: ${genericName} (${rxnormId})`);
  }
  const related = prescribableProperties
    ? (await getJson(`/Prescribe/rxcui/${id}/related.json?tty=BN+SBD`)).relatedGroup?.conceptGroup ?? []
    : [];
  const concepts = (tty) => related.filter((group) => group.tty === tty)
    .flatMap((group) => group.conceptProperties ?? []);
  const brands = concepts("BN");
  const products = concepts("SBD");
  const evidence = new Map();

  for (const product of products) {
    const match = product.name.match(/^(.*?) \[([^\]]+)\]$/);
    if (!match) continue;
    const [, ingredientAndForm, brandName] = match;
    // RxNorm puts multiple active ingredients on either side of " / ".
    // Do not treat combination products as an alias for one PGx ingredient.
    if (ingredientAndForm.includes(" / ")) continue;
    const key = brandName.trim().toLowerCase();
    const current = evidence.get(key) ?? [];
    current.push(product.rxcui);
    evidence.set(key, current);
  }

  const brandNames = brands.filter((brand) => evidence.has(brand.name.trim().toLowerCase()))
    .map((brand) => ({
      name: brand.name.trim(),
      rxnormId: `RxNorm:${brand.rxcui}`,
      singleIngredientProductRxnormIds: [...new Set(evidence.get(brand.name.trim().toLowerCase()))]
        .map((productId) => `RxNorm:${productId}`).sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (new Set(brandNames.map((brand) => brand.name.toLowerCase())).size !== brandNames.length) {
    throw new Error(`Duplicate brand names for ${genericName}`);
  }
  drugs.push({
    genericName,
    ingredientRxnormId: rxnormId,
    brandNames,
    brandStatus: !prescribableProperties ? "ingredient_not_in_current_us_prescribable_subset"
      : brandNames.length ? "active_single_ingredient_brand_found" : "none_found_in_current_us_prescribable_subset",
  });
  console.log(`${genericName}: ${brandNames.length} single-ingredient brand names`);
}

const snapshot = {
  schemaVersion: 1,
  status: "research_display_aliases_not_product_or_pgx_verification",
  fetchedAt: new Date().toISOString(),
  source: {
    name: "U.S. National Library of Medicine Prescribable RxNorm API",
    version: version.version,
    apiVersion: version.apiVersion,
    ingredientPropertiesUrlTemplate: `${prescribeBase}/rxcui/{rxcui}/properties.json`,
    nonPrescribableIdentityUrlTemplate: `${base}/rxcui/{rxcui}/properties.json`,
    relatedUrlTemplate: `${prescribeBase}/rxcui/{rxcui}/related.json?tty=BN+SBD`,
    documentationUrl: "https://www.lhncbc.nlm.nih.gov/RxNav/APIs/api-Prescribable.getRelatedByType.html",
    scopeUrl: "https://www.nlm.nih.gov/research/umls/rxnorm/docs/prescribe.html",
    termsUrl: "https://www.lhncbc.nlm.nih.gov/RxNav/TermsofService.html",
  },
  scopeSource: "data/cpic-gene-drug-catalog.v1.json",
  inclusion: "Current U.S. Prescribable RxNorm BN concepts with at least one active SBD whose name names one ingredient. Combination products and exclusive veterinary products are excluded; historical, international, discontinued and unlinked brand names may be absent.",
  ingredientCount: drugs.length,
  brandCount: drugs.reduce((count, drug) => count + drug.brandNames.length, 0),
  drugs,
};
const destination = join(root, "data/candidates");
await mkdir(destination, { recursive: true });
const output = join(destination, "rxnorm-drug-names.json");
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved candidate: ${output}`);
