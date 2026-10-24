import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const names = JSON.parse(await readFile(join(root, "data/rxnorm-drug-names.v1.json"), "utf8"));
const catalog = JSON.parse(await readFile(join(root, "data/cpic-gene-drug-catalog.v1.json"), "utf8"));
const ingredients = new Map();
for (const gene of catalog.genes) {
  for (const pair of gene.pairs) {
    const previous = ingredients.get(pair.rxnormId);
    if (previous && previous !== pair.drug) throw new Error(`Conflicting CPIC drug: ${pair.rxnormId}`);
    ingredients.set(pair.rxnormId, pair.drug);
  }
}

if (names.schemaVersion !== 1 ||
    names.status !== "research_display_aliases_not_product_or_pgx_verification" ||
    !names.source.version || !names.source.apiVersion ||
    names.ingredientCount !== ingredients.size || names.drugs.length !== ingredients.size) {
  throw new Error("RxNorm name snapshot metadata or ingredient coverage is invalid");
}
const seen = new Set();
let brandCount = 0;
for (const drug of names.drugs) {
  if (seen.has(drug.ingredientRxnormId) ||
      ingredients.get(drug.ingredientRxnormId) !== drug.genericName ||
      !/^RxNorm:\d+$/.test(drug.ingredientRxnormId)) {
    throw new Error(`Missing, duplicate, or mismatched ingredient: ${drug.genericName}`);
  }
  seen.add(drug.ingredientRxnormId);
  const expectedStatus = drug.brandNames.length ? "active_single_ingredient_brand_found" : null;
  if (expectedStatus ? drug.brandStatus !== expectedStatus : ![
    "none_found_in_current_us_prescribable_subset",
    "ingredient_not_in_current_us_prescribable_subset",
  ].includes(drug.brandStatus)) {
    throw new Error(`Invalid brand status: ${drug.genericName}`);
  }
  const brandKeys = new Set();
  for (const brand of drug.brandNames) {
    const key = brand.name.trim().toLowerCase();
    if (!key || brandKeys.has(key) || !/^RxNorm:\d+$/.test(brand.rxnormId) ||
        !Array.isArray(brand.singleIngredientProductRxnormIds) ||
        !brand.singleIngredientProductRxnormIds.length ||
        brand.singleIngredientProductRxnormIds.some((id) => !/^RxNorm:\d+$/.test(id))) {
      throw new Error(`Invalid brand mapping: ${drug.genericName} / ${brand.name}`);
    }
    brandKeys.add(key);
    brandCount++;
  }
}
if (names.brandCount !== brandCount) throw new Error("Brand mapping count is inconsistent");
console.log(`Validated RxNorm names: ${seen.size} generic ingredients, ${brandCount} current U.S. brand mappings.`);
